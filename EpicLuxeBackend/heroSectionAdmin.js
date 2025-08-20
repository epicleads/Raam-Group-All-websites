require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const router = express.Router();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Multer setup
const upload = multer({ dest: 'uploads/' });

/**
 * UPLOAD Hero Banner
 */
router.post('/upload-hero', upload.single('image'), async (req, res) => {
  const {
    title,
    subtitle,
    badge,
    position,
    cta1_text,
    cta1_url_or_action,
    cta2_text,
    cta2_url_or_action,
  } = req.body;
  const file = req.file;

  if (!file || !title || !subtitle || !badge || position === undefined) {
    return res.status(400).json({ error: 'Image, title, subtitle, badge, and position are required' });
  }

  const uniqueName = `${uuidv4()}-${file.originalname}`;
  const filePath = `banners/${uniqueName}`;

  let fileBuffer;
  try {
    fileBuffer = fs.readFileSync(file.path);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read uploaded file' });
  }

  const { error: uploadError } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET_HERO)
    .upload(filePath, fileBuffer, { contentType: file.mimetype });

  fs.unlinkSync(file.path);

  if (uploadError) {
    return res.status(500).json({ error: uploadError.message });
  }

  const { data: urlData } = supabase.storage
    .from(process.env.SUPABASE_BUCKET_HERO)
    .getPublicUrl(filePath);

  const imageUrl = urlData.publicUrl;

  const { error: dbError, data } = await supabase
    .from('hero_banners')
    .insert([
      {
        image_url: imageUrl,
        title,
        subtitle,
        badge,
        position: parseInt(position, 10),
        cta1_text,
        cta1_url_or_action,
        cta2_text,
        cta2_url_or_action,
      },
    ])
    .select();

  if (dbError) {
    return res.status(500).json({ error: dbError.message });
  }

  return res.status(200).json({
    message: 'Hero banner uploaded successfully',
    data: data[0],
  });
});

/**
 * DELETE Hero Banner
 */
router.delete('/delete-hero/:id', async (req, res) => {
  const { id } = req.params;

  const { data: existingBanner, error: fetchError } = await supabase
    .from('hero_banners')
    .select('image_url')
    .eq('id', id)
    .single();

  if (fetchError || !existingBanner) {
    return res.status(404).json({ error: 'Banner not found' });
  }

  const imagePath = existingBanner.image_url.split('/').slice(-2).join('/');

  const { error: removeError } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET_HERO)
    .remove([imagePath]);

  if (removeError) {
    return res.status(500).json({ error: removeError.message });
  }

  const { error: deleteError } = await supabase
    .from('hero_banners')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return res.status(500).json({ error: deleteError.message });
  }

  return res.status(200).json({ message: 'Banner deleted successfully' });
});

/**
 * UPDATE Hero Banner (excluding image)
 */
router.put('/update-hero/:id', async (req, res) => {
  const { id } = req.params;
  const {
    title,
    subtitle,
    badge,
    position,
    cta1_text,
    cta1_url_or_action,
    cta2_text,
    cta2_url_or_action,
  } = req.body;

  if (!title || !subtitle || !badge || position === undefined) {
    return res.status(400).json({ error: 'Title, subtitle, badge, and position are required' });
  }

  const { data, error } = await supabase
    .from('hero_banners')
    .update({
      title,
      subtitle,
      badge,
      position: parseInt(position, 10),
      cta1_text,
      cta1_url_or_action,
      cta2_text,
      cta2_url_or_action,
    })
    .eq('id', id)
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ message: 'Banner updated successfully', data: data[0] });
});

/**
 * GET all Hero Banners
 */
router.get('/banners', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('hero_banners')
      .select('*')
      .order('position', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ banners: data });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected server error' });
  }
});

module.exports = router;
