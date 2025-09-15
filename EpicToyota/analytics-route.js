const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const geoip = require('geoip-lite');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
const axios = require('axios');

const router = express.Router();

// Enhanced logging system
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/analytics-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/analytics-combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ],
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'your-supabase-url',
  process.env.SUPABASE_SERVICE_KEY || 'your-supabase-service-key',
  {
    auth: { persistSession: false }
  }
);

// Security middleware
router.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com", "https://connect.facebook.net"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https://www.google-analytics.com", "https://analytics.google.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Enterprise-grade rate limiting
const analyticsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many analytics events from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for trusted IPs (optional)
    const trustedIPs = process.env.TRUSTED_IPS?.split(',') || [];
    return trustedIPs.includes(req.ip);
  }
});

const batchRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit batch submissions
  message: {
    error: 'Too many batch requests, please slow down.',
    code: 'BATCH_RATE_LIMIT_EXCEEDED'
  }
});

// Advanced IP anonymization with geolocation
function anonymizeIP(ip) {
  try {
    // Get geolocation data before anonymization
    const geo = geoip.lookup(ip);
    const country = geo?.country || null;
    const region = geo?.region || null;
    const city = geo?.city || null;
    
    let anonymizedIP;
    
    if (ip.includes(':')) {
      // IPv6: Keep only first 48 bits (3 groups of 16 bits)
      const parts = ip.split(':');
      anonymizedIP = parts.slice(0, 3).join(':') + ':0000:0000:0000:0000';
    } else {
      // IPv4: Zero out last octet
      const parts = ip.split('.');
      anonymizedIP = parts.slice(0, 3).join('.') + '.0';
    }
    
    // Hash the anonymized IP with salt
    const salt = process.env.IP_HASH_SALT || 'epic-toyota-salt-2024';
    const hash = crypto
      .createHmac('sha256', salt)
      .update(anonymizedIP + new Date().toISOString().slice(0, 10)) // Daily rotation
      .digest('hex')
      .substring(0, 16); // Truncate for storage efficiency
    
    return {
      ipHash: hash,
      country,
      region,
      city: process.env.COLLECT_CITY === 'true' ? city : null // Optional city collection
    };
  } catch (error) {
    logger.error('IP anonymization failed:', error);
    return {
      ipHash: 'unknown',
      country: null,
      region: null,
      city: null
    };
  }
}

// Extract real client IP from various headers
function getClientIP(req) {
  return req.headers['cf-connecting-ip'] || // Cloudflare
         req.headers['x-real-ip'] || // Nginx
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() || // Load balancer
         req.headers['x-client-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
}

// Enhanced user agent parsing
function parseUserAgent(userAgent) {
  try {
    // Simple user agent parsing (you could use ua-parser-js for more detail)
    const isBot = /bot|crawler|spider|crawling/i.test(userAgent);
    const isMobile = /mobile|android|iphone|ipad|blackberry/i.test(userAgent);
    const isTablet = /ipad|tablet/i.test(userAgent);
    
    let browser = 'unknown';
    if (userAgent.includes('Chrome/')) browser = 'Chrome';
    else if (userAgent.includes('Firefox/')) browser = 'Firefox';
    else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) browser = 'Safari';
    else if (userAgent.includes('Edge/')) browser = 'Edge';
    
    return {
      isBot,
      isMobile,
      isTablet,
      browser,
      deviceType: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'
    };
  } catch (error) {
    return { isBot: false, isMobile: false, isTablet: false, browser: 'unknown', deviceType: 'unknown' };
  }
}

// Event validation middleware
const validateEvent = [
  body('client_id').isUUID().withMessage('Invalid client_id format'),
  body('event_type').isIn([
    'page_view', 'click', 'form_submit', 'cta_click', 'scroll_depth', 
    'session_start', 'session_end', 'file_download', 'external_link',
    'video_play', 'video_complete', 'search', 'lead_conversion',
    'phone_click', 'email_click', 'brochure_download', 'test_drive_request',
    'finance_inquiry', 'service_booking', 'parts_inquiry'
  ]).withMessage('Invalid event_type'),
  body('event_name').optional().isLength({ min: 1, max: 100 }).withMessage('Event name too long'),
  body('payload').optional().isObject().withMessage('Payload must be an object'),
  body('consent_given').isBoolean().withMessage('Consent status required'),
  body('session_id').optional().isUUID().withMessage('Invalid session_id format'),
  body('page_url').optional().isURL().withMessage('Invalid page URL'),
  body('referrer').optional().isURL().withMessage('Invalid referrer URL'),
  body('timestamp').optional().isISO8601().withMessage('Invalid timestamp format')
];

const validateBatchEvents = [
  body('events').isArray({ min: 1, max: 50 }).withMessage('Events array must contain 1-50 items'),
  body('events.*.client_id').isUUID().withMessage('Invalid client_id format'),
  body('events.*.event_type').isIn([
    'page_view', 'click', 'form_submit', 'cta_click', 'scroll_depth',
    'session_start', 'session_end', 'file_download', 'external_link',
    'video_play', 'video_complete', 'search', 'lead_conversion',
    'phone_click', 'email_click', 'brochure_download', 'test_drive_request',
    'finance_inquiry', 'service_booking', 'parts_inquiry'
  ]).withMessage('Invalid event_type'),
  body('events.*.consent_given').isBoolean().withMessage('Consent status required')
];

// Event deduplication cache (in-memory, could be Redis in production)
const eventCache = new Map();
const DEDUP_WINDOW = 30000; // 30 seconds

function generateEventHash(clientId, eventType, eventName, payload) {
  const data = `${clientId}-${eventType}-${eventName}-${JSON.stringify(payload)}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

function isDuplicateEvent(hash) {
  const now = Date.now();
  const eventTime = eventCache.get(hash);
  
  if (eventTime && (now - eventTime) < DEDUP_WINDOW) {
    return true;
  }
  
  eventCache.set(hash, now);
  
  // Cleanup old entries
  if (eventCache.size > 10000) {
    const cutoff = now - DEDUP_WINDOW;
    for (const [key, time] of eventCache.entries()) {
      if (time < cutoff) {
        eventCache.delete(key);
      }
    }
  }
  
  return false;
}

// GA4 Measurement Protocol integration
async function sendToGA4(event, clientIP) {
  if (!process.env.GA4_MEASUREMENT_ID || !process.env.GA4_API_SECRET) {
    return;
  }

  try {
    const ga4Event = {
      client_id: event.client_id,
      events: [{
        name: event.event_type,
        parameters: {
          event_category: event.payload?.category || 'engagement',
          event_label: event.event_name || '',
          page_location: event.payload?.page_url || '',
          page_referrer: event.payload?.referrer || '',
          ...event.payload
        }
      }]
    };

    await axios.post(
      `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA4_MEASUREMENT_ID}&api_secret=${process.env.GA4_API_SECRET}`,
      ga4Event,
      {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    logger.warn('Failed to send event to GA4:', error.message);
  }
}

// Facebook Conversions API integration
async function sendToFacebookAPI(event, clientIP) {
  if (!process.env.FACEBOOK_PIXEL_ID || !process.env.FACEBOOK_ACCESS_TOKEN) {
    return;
  }

  try {
    const fbEvent = {
      data: [{
        event_name: event.event_type === 'lead_conversion' ? 'Lead' : 'PageView',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        user_data: {
          client_ip_address: clientIP,
          client_user_agent: event.user_agent,
          fbp: event.payload?.fbp, // Facebook browser ID
          fbc: event.payload?.fbc  // Facebook click ID
        },
        custom_data: event.payload || {}
      }],
      test_event_code: process.env.FACEBOOK_TEST_CODE // Remove in production
    };

    await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.FACEBOOK_PIXEL_ID}/events`,
      fbEvent,
      {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.FACEBOOK_ACCESS_TOKEN}`
        }
      }
    );
  } catch (error) {
    logger.warn('Failed to send event to Facebook:', error.message);
  }
}

// Single event ingestion endpoint
router.post('/events', analyticsRateLimit, validateEvent, async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const { ipHash, country, region, city } = anonymizeIP(clientIP);
    const uaData = parseUserAgent(userAgent);

    // Skip bot traffic
    if (uaData.isBot && process.env.SKIP_BOTS !== 'false') {
      return res.status(200).json({
        success: true,
        message: 'Bot traffic filtered',
        processed: false
      });
    }

    const {
      client_id,
      event_type,
      event_name = '',
      payload = {},
      consent_given,
      session_id,
      timestamp
    } = req.body;

    // Event deduplication
    const eventHash = generateEventHash(client_id, event_type, event_name, payload);
    if (isDuplicateEvent(eventHash)) {
      return res.status(200).json({
        success: true,
        message: 'Duplicate event filtered',
        processed: false
      });
    }

    // Prepare event data
    const eventData = {
      client_id,
      session_id,
      event_type,
      event_name,
      payload: {
        ...payload,
        device_type: uaData.deviceType,
        browser: uaData.browser,
        is_mobile: uaData.isMobile,
        timestamp: timestamp || new Date().toISOString()
      },
      ip_hash: ipHash,
      country,
      region,
      city,
      user_agent: userAgent.substring(0, 500), // Truncate long user agents
      consent_given,
      created_at: new Date().toISOString()
    };

    // Store in Supabase
    const { error: dbError } = await supabase
      .from('epic_toyota_analytics')
      .insert([eventData]);

    if (dbError) {
      logger.error('Database insertion failed:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        code: 'DB_ERROR'
      });
    }

    // Send to external platforms if consent given
    if (consent_given && payload.analytics_consent) {
      await Promise.allSettled([
        sendToGA4(eventData, clientIP),
        payload.marketing_consent ? sendToFacebookAPI(eventData, clientIP) : Promise.resolve()
      ]);
    }

    logger.info('Event processed successfully', {
      client_id,
      event_type,
      event_name,
      country,
      device_type: uaData.deviceType
    });

    res.status(200).json({
      success: true,
      message: 'Event processed successfully',
      processed: true,
      event_id: eventHash.substring(0, 8)
    });

  } catch (error) {
    logger.error('Event processing failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Batch event ingestion endpoint
router.post('/events/batch', batchRateLimit, validateBatchEvents, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const { ipHash, country, region, city } = anonymizeIP(clientIP);
    const uaData = parseUserAgent(userAgent);

    if (uaData.isBot && process.env.SKIP_BOTS !== 'false') {
      return res.status(200).json({
        success: true,
        message: 'Bot traffic filtered',
        processed: 0
      });
    }

    const { events } = req.body;
    const processedEvents = [];
    let duplicateCount = 0;

    for (const event of events) {
      // Event deduplication
      const eventHash = generateEventHash(
        event.client_id, 
        event.event_type, 
        event.event_name || '', 
        event.payload || {}
      );
      
      if (isDuplicateEvent(eventHash)) {
        duplicateCount++;
        continue;
      }

      const eventData = {
        client_id: event.client_id,
        session_id: event.session_id,
        event_type: event.event_type,
        event_name: event.event_name || '',
        payload: {
          ...(event.payload || {}),
          device_type: uaData.deviceType,
          browser: uaData.browser,
          is_mobile: uaData.isMobile,
          timestamp: event.timestamp || new Date().toISOString()
        },
        ip_hash: ipHash,
        country,
        region,
        city,
        user_agent: userAgent.substring(0, 500),
        consent_given: event.consent_given,
        created_at: new Date().toISOString()
      };

      processedEvents.push(eventData);
    }

    if (processedEvents.length > 0) {
      // Batch insert to Supabase
      const { error: dbError } = await supabase
        .from('epic_toyota_analytics')
        .insert(processedEvents);

      if (dbError) {
        logger.error('Batch database insertion failed:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Database error',
          code: 'DB_ERROR'
        });
      }

      // Send to external platforms for consented events
      const externalPromises = processedEvents
        .filter(event => event.consent_given && event.payload.analytics_consent)
        .map(event => Promise.allSettled([
          sendToGA4(event, clientIP),
          event.payload.marketing_consent ? sendToFacebookAPI(event, clientIP) : Promise.resolve()
        ]));

      await Promise.allSettled(externalPromises);
    }

    logger.info('Batch events processed', {
      total: events.length,
      processed: processedEvents.length,
      duplicates: duplicateCount,
      country
    });

    res.status(200).json({
      success: true,
      message: 'Batch events processed successfully',
      total: events.length,
      processed: processedEvents.length,
      duplicates: duplicateCount
    });

  } catch (error) {
    logger.error('Batch event processing failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Consent revocation endpoint
router.post('/consent/revoke', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many revocation requests' }
}), [
  body('client_id').isUUID().withMessage('Invalid client_id format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { client_id } = req.body;
    const clientIP = getClientIP(req);
    const { ipHash } = anonymizeIP(clientIP);

    // Log consent revocation
    await supabase
      .from('epic_toyota_analytics')
      .insert([{
        client_id,
        event_type: 'consent_revoked',
        event_name: 'privacy_action',
        payload: { action: 'revoke_consent' },
        ip_hash: ipHash,
        consent_given: false,
        created_at: new Date().toISOString()
      }]);

    // In a real implementation, you might also:
    // 1. Stop processing future events for this client
    // 2. Delete historical data if required by law
    // 3. Notify external services to stop tracking

    res.status(200).json({
      success: true,
      message: 'Consent revoked successfully'
    });

  } catch (error) {
    logger.error('Consent revocation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Check Supabase connection
    const { error } = await supabase
      .from('epic_toyota_analytics')
      .select('count')
      .limit(1);

    if (error) {
      throw error;
    }

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        rateLimit: 'active',
        logging: 'active'
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Analytics dashboard endpoint (basic)
router.get('/dashboard', async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    
    const query = supabase
      .from('epic_toyota_analytics')
      .select('event_type, country, created_at')
      .gte('created_at', from_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .lte('created_at', to_date || new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1000);

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Basic analytics aggregation
    const stats = {
      total_events: data.length,
      event_types: {},
      countries: {},
      daily_counts: {}
    };

    data.forEach(event => {
      // Event type counts
      stats.event_types[event.event_type] = (stats.event_types[event.event_type] || 0) + 1;
      
      // Country counts
      if (event.country) {
        stats.countries[event.country] = (stats.countries[event.country] || 0) + 1;
      }
      
      // Daily counts
      const date = event.created_at.split('T')[0];
      stats.daily_counts[date] = (stats.daily_counts[date] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      data: stats,
      period: {
        from: from_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        to: to_date || new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Dashboard query failed:', error);
    res.status(500).json({
      success: false,
      message: 'Dashboard error'
    });
  }
});

module.exports = router;