const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
// Make sure to set these environment variables in your .env file
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Utility function to generate a URL-friendly slug from a title
 * @param {string} title - The blog title
 * @returns {string} - URL-friendly slug
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Upload an image to Supabase storage bucket 'blog-media'
 * @param {File|Buffer} file - The image file to upload
 * @param {string} fileName - The name for the uploaded file
 * @returns {Object} - Success/error response with file URL
 */
async function uploadImage(file, fileName) {
  try {
    // Generate unique filename to avoid conflicts
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}-${fileName}`;

    const { data, error } = await supabase.storage
      .from('blog-media')
      .upload(uniqueFileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      return {
        success: false,
        error: `Failed to upload image: ${error.message}`
      };
    }

    // Get the public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from('blog-media')
      .getPublicUrl(data.path);

    return {
      success: true,
      data: {
        path: data.path,
        url: urlData.publicUrl
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Upload failed: ${error.message}`
    };
  }
}

/**
 * Create a new blog post
 * @param {Object} blogData - Blog data object
 * @returns {Object} - Success/error response with created blog data
 */
async function createBlog(blogData) {
  try {
    // Generate slug from title if not provided
    const slug = blogData.slug || generateSlug(blogData.title);

    // Check if slug already exists
    const { data: existingBlog } = await supabase
      .from('blogs')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingBlog) {
      return {
        success: false,
        error: 'A blog with this slug already exists'
      };
    }

    // Prepare blog data with auto-generated fields
    const blogToCreate = {
      ...blogData,
      slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Set publishedAt if status is 'published' and not already set
      publishedAt: blogData.status === 'published' && !blogData.publishedAt 
        ? new Date().toISOString() 
        : blogData.publishedAt
    };

    const { data, error } = await supabase
      .from('blogs')
      .insert([blogToCreate])
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Failed to create blog: ${error.message}`
      };
    }

    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: `Create blog failed: ${error.message}`
    };
  }
}

/**
 * Get all blogs with optional filtering
 * @param {Object} filters - Optional filters (category, status, publishedAt)
 * @param {number} limit - Maximum number of blogs to return (default: 50)
 * @param {number} offset - Number of blogs to skip for pagination (default: 0)
 * @returns {Object} - Success/error response with blogs array
 */
async function getAllBlogs(filters = {}, limit = 50, offset = 0) {
  try {
    let query = supabase
      .from('blogs')
      .select('*')
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters if provided
    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.featured !== undefined) {
      query = query.eq('featured', filters.featured);
    }

    // Filter by published date range
    if (filters.publishedAfter) {
      query = query.gte('publishedAt', filters.publishedAfter);
    }

    if (filters.publishedBefore) {
      query = query.lte('publishedAt', filters.publishedBefore);
    }

    // Search in title, subtitle, or content
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,subtitle.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return {
        success: false,
        error: `Failed to fetch blogs: ${error.message}`
      };
    }

    return {
      success: true,
      data,
      count: data.length,
      hasMore: data.length === limit
    };
  } catch (error) {
    return {
      success: false,
      error: `Get blogs failed: ${error.message}`
    };
  }
}

/**
 * Get a single blog by its slug
 * @param {string} slug - The blog slug
 * @returns {Object} - Success/error response with blog data
 */
async function getBlogBySlug(slug) {
  try {
    const { data, error } = await supabase
      .from('blogs')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Blog not found'
        };
      }
      return {
        success: false,
        error: `Failed to fetch blog: ${error.message}`
      };
    }

    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: `Get blog failed: ${error.message}`
    };
  }
}

/**
 * Update an existing blog
 * @param {string} slug - The blog slug to update
 * @param {Object} updateData - Data to update
 * @returns {Object} - Success/error response with updated blog data
 */
async function updateBlog(slug, updateData) {
  try {
    // If title is being updated and no new slug provided, regenerate slug
    if (updateData.title && !updateData.slug) {
      const newSlug = generateSlug(updateData.title);
      
      // Check if new slug conflicts with existing blogs (excluding current one)
      const { data: existingBlog } = await supabase
        .from('blogs')
        .select('id')
        .eq('slug', newSlug)
        .neq('slug', slug)
        .single();

      if (existingBlog) {
        return {
          success: false,
          error: 'Generated slug conflicts with existing blog'
        };
      }

      updateData.slug = newSlug;
    }

    // Set publishedAt if status is changing to 'published' and not already set
    if (updateData.status === 'published' && !updateData.publishedAt) {
      updateData.publishedAt = new Date().toISOString();
    }

    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from('blogs')
      .update(updateData)
      .eq('slug', slug)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Blog not found'
        };
      }
      return {
        success: false,
        error: `Failed to update blog: ${error.message}`
      };
    }

    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: `Update blog failed: ${error.message}`
    };
  }
}

/**
 * Delete a blog and optionally remove its image from storage
 * @param {string} slug - The blog slug to delete
 * @param {boolean} removeImage - Whether to remove the associated image from storage
 * @returns {Object} - Success/error response
 */
async function deleteBlog(slug, removeImage = false) {
  try {
    // First, get the blog to check if it exists and get image path
    const { data: blog, error: fetchError } = await supabase
      .from('blogs')
      .select('id, image')
      .eq('slug', slug)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return {
          success: false,
          error: 'Blog not found'
        };
      }
      return {
        success: false,
        error: `Failed to fetch blog for deletion: ${fetchError.message}`
      };
    }

    // Delete the blog from database
    const { error: deleteError } = await supabase
      .from('blogs')
      .delete()
      .eq('slug', slug);

    if (deleteError) {
      return {
        success: false,
        error: `Failed to delete blog: ${deleteError.message}`
      };
    }

    // Optionally remove image from storage
    if (removeImage && blog.image) {
      try {
        // Extract filename from URL or use full path if it's already a path
        const imagePath = blog.image.includes('/') 
          ? blog.image.split('/').pop() 
          : blog.image;

        const { error: storageError } = await supabase.storage
          .from('blog-media')
          .remove([imagePath]);

        if (storageError) {
          console.warn(`Failed to remove image from storage: ${storageError.message}`);
          // Don't fail the entire operation if image removal fails
        }
      } catch (imageError) {
        console.warn(`Error removing image: ${imageError.message}`);
      }
    }

    return {
      success: true,
      message: 'Blog deleted successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: `Delete blog failed: ${error.message}`
    };
  }
}

/**
 * Get blog statistics
 * @returns {Object} - Success/error response with statistics
 */
async function getBlogStats() {
  try {
    const { data: totalBlogs, error: totalError } = await supabase
      .from('blogs')
      .select('id', { count: 'exact' });

    const { data: publishedBlogs, error: publishedError } = await supabase
      .from('blogs')
      .select('id', { count: 'exact' })
      .eq('status', 'published');

    const { data: featuredBlogs, error: featuredError } = await supabase
      .from('blogs')
      .select('id', { count: 'exact' })
      .eq('featured', true);

    if (totalError || publishedError || featuredError) {
      return {
        success: false,
        error: 'Failed to fetch blog statistics'
      };
    }

    return {
      success: true,
      data: {
        total: totalBlogs.length,
        published: publishedBlogs.length,
        featured: featuredBlogs.length,
        draft: totalBlogs.length - publishedBlogs.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Get stats failed: ${error.message}`
    };
  }
}

// Express routes
const express = require('express');
const multer = require('multer');
const router = express.Router();

// Configure multer for file uploads (store in memory)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Create blog
router.post('/blogs', async (req, res) => {
  try {
    const result = await createBlog(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get all blogs with filtering and pagination
router.get('/blogs', async (req, res) => {
  try {
    const { 
      category, 
      status, 
      featured, 
      search, 
      publishedAfter,
      publishedBefore,
      limit = 50, 
      offset = 0 
    } = req.query;
    
    const filters = { 
      category, 
      status, 
      featured: featured !== undefined ? featured === 'true' : undefined,
      search,
      publishedAfter,
      publishedBefore
    };
    
    // Remove undefined values
    Object.keys(filters).forEach(key => 
      filters[key] === undefined && delete filters[key]
    );
    
    const result = await getAllBlogs(filters, parseInt(limit), parseInt(offset));
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get blog by slug
router.get('/blogs/:slug', async (req, res) => {
  try {
    const result = await getBlogBySlug(req.params.slug);
    if (!result.success && result.error === 'Blog not found') {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update blog
router.put('/blogs/:slug', async (req, res) => {
  try {
    const result = await updateBlog(req.params.slug, req.body);
    if (!result.success && result.error === 'Blog not found') {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Delete blog
router.delete('/blogs/:slug', async (req, res) => {
  try {
    const { removeImage } = req.query;
    const result = await deleteBlog(req.params.slug, removeImage === 'true');
    if (!result.success && result.error === 'Blog not found') {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Upload image
router.post('/blogs/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    const result = await uploadImage(req.file.buffer, req.file.originalname);
    res.json(result);
  } catch (error) {
    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get blog statistics
router.get('/blogs-stats', async (req, res) => {
  try {
    const result = await getBlogStats();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Export both the router and individual functions
module.exports = router;

// Also export individual functions for direct use if needed
module.exports.functions = {
  createBlog,
  getAllBlogs,
  getBlogBySlug,
  updateBlog,
  deleteBlog,
  uploadImage,
  getBlogStats,
  generateSlug
};
