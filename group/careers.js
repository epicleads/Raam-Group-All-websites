// careersBackend.js
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET_NAME = process.env.SUPABASE_BUCKET_CAREERS_DOCUMENTS || 'careers-docs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// -----------------------------
// JOBS CRUD OPERATIONS
// -----------------------------

/**
 * Create a new job opening
 * @param {Object} jobData - { title, department, brand, posted_date, last_date, overview, requirements, benefits, employment_type }
 */
async function createJob(jobData) {
  const { data, error } = await supabase
    .from('careers_openings')
    .insert([jobData])
    .select();
  if (error) throw error;
  return data[0];
}

/**
 * Get all job openings
 */
async function getAllJobs() {
  const { data, error } = await supabase
    .from('careers_openings')
    .select('*')
    .order('posted_date', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Get a single job by ID
 * @param {string} jobId 
 */
async function getJobById(jobId) {
  const { data, error } = await supabase
    .from('careers_openings')
    .select('*')
    .eq('id', jobId)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Update a job by ID
 * @param {string} jobId 
 * @param {Object} updateData 
 */
async function updateJob(jobId, updateData) {
  const { data, error } = await supabase
    .from('careers_openings')
    .update(updateData)
    .eq('id', jobId)
    .select();
  if (error) throw error;
  return data[0];
}

/**
 * Delete a job by ID
 * @param {string} jobId 
 */
async function deleteJob(jobId) {
  const { data, error } = await supabase
    .from('careers_openings')
    .delete()
    .eq('id', jobId)
    .select();
  if (error) throw error;
  return data[0];
}

// -----------------------------
// APPLICANTS OPERATIONS
// -----------------------------

/**
 * Create a new applicant
 * @param {Object} applicantData - { job_id, full_name, email, phone, current_city, current_state, current_country, total_experience_years, current_company, education_level, resume_path, linkedin_url, additional_docs }
 */
async function createApplicant(applicantData) {
  let resume_url = null;
  const additional_docs_urls = [];

  // Handle resume upload
  if (applicantData.resume_path) {
    const fileName = path.basename(applicantData.resume_path);
    const fileStream = fs.createReadStream(applicantData.resume_path);

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(`resumes/${Date.now()}_${fileName}`, fileStream, { upsert: true });

    if (error) throw error;
    resume_url = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path).publicUrl;
  }

  // Handle additional documents
  if (applicantData.additional_docs && applicantData.additional_docs.length > 0) {
    for (const docPath of applicantData.additional_docs) {
      const fileName = path.basename(docPath);
      const fileStream = fs.createReadStream(docPath);
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(`additional/${Date.now()}_${fileName}`, fileStream, { upsert: true });
      if (error) throw error;
      const docUrl = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path).publicUrl;
      additional_docs_urls.push(docUrl);
    }
  }

  const payload = {
    job_id: applicantData.job_id,
    full_name: applicantData.full_name,
    email: applicantData.email,
    phone: applicantData.phone,
    current_city: applicantData.current_city,
    current_state: applicantData.current_state,
    current_country: applicantData.current_country || 'India',
    total_experience_years: applicantData.total_experience_years,
    current_company: applicantData.current_company,
    education_level: applicantData.education_level,
    resume_url,
    resume_text: applicantData.resume_text || null,
    linkedin_url: applicantData.linkedin_url || null,
    additional_documents: additional_docs_urls,
    status: 'received'
  };

  const { data, error } = await supabase.from('careers_applicants').insert([payload]).select();
  if (error) throw error;
  return data[0];
}

/**
 * Get all applicants
 */
async function getAllApplicants() {
  const { data, error } = await supabase
    .from('careers_applicants')
    .select('*')
    .order('applied_at', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Get applicants by job ID
 * @param {string} jobId 
 */
async function getApplicantsByJob(jobId) {
  const { data, error } = await supabase
    .from('careers_applicants')
    .select('*')
    .eq('job_id', jobId)
    .order('applied_at', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Update applicant status
 * @param {string} applicantId 
 * @param {string} status - received / under_review / shortlisted / rejected / offered / hired
 */
async function updateApplicantStatus(applicantId, status) {
  const { data, error } = await supabase
    .from('careers_applicants')
    .update({ status, updated_at: new Date() })
    .eq('id', applicantId)
    .select();
  if (error) throw error;
  return data[0];
}

/**
 * Delete applicant
 * @param {string} applicantId 
 */
async function deleteApplicant(applicantId) {
  const { data, error } = await supabase
    .from('careers_applicants')
    .delete()
    .eq('id', applicantId)
    .select();
  if (error) throw error;
  return data[0];
}

// -----------------------------
// EXPRESS ROUTES
// -----------------------------
const express = require('express');
const router = express.Router();

// Jobs Routes
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await getAllJobs();
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await getJobById(req.params.id);
    res.json(job);
  } catch (error) {
    res.status(404).json({ error: 'Job not found' });
  }
});

router.post('/jobs', async (req, res) => {
  try {
    const job = await createJob(req.body);
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/jobs/:id', async (req, res) => {
  try {
    const job = await updateJob(req.params.id, req.body);
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/jobs/:id', async (req, res) => {
  try {
    const job = await deleteJob(req.params.id);
    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Applicants Routes
router.get('/applicants', async (req, res) => {
  try {
    const applicants = await getAllApplicants();
    res.json(applicants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/applicants/job/:jobId', async (req, res) => {
  try {
    const applicants = await getApplicantsByJob(req.params.jobId);
    res.json(applicants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/applicants', async (req, res) => {
  try {
    const applicant = await createApplicant(req.body);
    res.status(201).json(applicant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/applicants/:id/status', async (req, res) => {
  try {
    const applicant = await updateApplicantStatus(req.params.id, req.body.status);
    res.json(applicant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/applicants/:id', async (req, res) => {
  try {
    const applicant = await deleteApplicant(req.params.id);
    res.json({ success: true, applicant });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -----------------------------
// EXPORTS
// -----------------------------

module.exports = router;
