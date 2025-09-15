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

// Multer setup for multiple files
const upload = multer({ dest: 'uploads/' });

/**
 * UPLOAD Hero Banner with PC and Mobile Images
 */
router.post('/upload-hero', upload.fields([
  { name: 'image', maxCount: 1 },      // PC image (required)
  { name: 'mobile_image', maxCount: 1 } // Mobile image (optional)
]), async (req, res) => {
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
  
  const pcImage = req.files?.image?.[0];
  const mobileImage = req.files?.mobile_image?.[0];

  if (!pcImage || !title || !subtitle || !badge || position === undefined) {
    return res.status(400).json({ error: 'PC image, title, subtitle, badge, and position are required' });
  }

  let pcImageUrl = null;
  let mobileImageUrl = null;

  try {
    // Upload PC Image
    const pcUniqueName = `${uuidv4()}-pc-${pcImage.originalname}`;
    const pcFilePath = `banners/${pcUniqueName}`;
    const pcFileBuffer = fs.readFileSync(pcImage.path);

    const { error: pcUploadError } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET_HERO)
      .upload(pcFilePath, pcFileBuffer, { contentType: pcImage.mimetype });

    fs.unlinkSync(pcImage.path);

    if (pcUploadError) {
      return res.status(500).json({ error: `PC image upload failed: ${pcUploadError.message}` });
    }

    const { data: pcUrlData } = supabase.storage
      .from(process.env.SUPABASE_BUCKET_HERO)
      .getPublicUrl(pcFilePath);

    pcImageUrl = pcUrlData.publicUrl;

    // Upload Mobile Image (if provided)
    if (mobileImage) {
      const mobileUniqueName = `${uuidv4()}-mobile-${mobileImage.originalname}`;
      const mobileFilePath = `banners/${mobileUniqueName}`;
      const mobileFileBuffer = fs.readFileSync(mobileImage.path);

      const { error: mobileUploadError } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET_HERO)
        .upload(mobileFilePath, mobileFileBuffer, { contentType: mobileImage.mimetype });

      fs.unlinkSync(mobileImage.path);

      if (mobileUploadError) {
        // If mobile upload fails, still continue but log the error
        console.warn('Mobile image upload failed:', mobileUploadError.message);
      } else {
        const { data: mobileUrlData } = supabase.storage
          .from(process.env.SUPABASE_BUCKET_HERO)
          .getPublicUrl(mobileFilePath);

        mobileImageUrl = mobileUrlData.publicUrl;
      }
    }

    // Insert into database
    const { error: dbError, data } = await supabase
      .from('hero_banners')
      .insert([
        {
          image_url: pcImageUrl,
          mobile_image_url: mobileImageUrl,
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

  } catch (err) {
    // Clean up any uploaded files in case of error
    if (pcImage && fs.existsSync(pcImage.path)) {
      fs.unlinkSync(pcImage.path);
    }
    if (mobileImage && fs.existsSync(mobileImage.path)) {
      fs.unlinkSync(mobileImage.path);
    }
    
    return res.status(500).json({ error: 'Failed to process images: ' + err.message });
  }
});

/**
 * DELETE Hero Banner (with PC and Mobile images)
 */
router.delete('/delete-hero/:id', async (req, res) => {
  const { id } = req.params;

  const { data: existingBanner, error: fetchError } = await supabase
    .from('hero_banners')
    .select('image_url, mobile_image_url')
    .eq('id', id)
    .single();

  if (fetchError || !existingBanner) {
    return res.status(404).json({ error: 'Banner not found' });
  }

  // Prepare images to delete
  const imagesToDelete = [];
  
  if (existingBanner.image_url) {
    const pcImagePath = existingBanner.image_url.split('/').slice(-2).join('/');
    imagesToDelete.push(pcImagePath);
  }
  
  if (existingBanner.mobile_image_url) {
    const mobileImagePath = existingBanner.mobile_image_url.split('/').slice(-2).join('/');
    imagesToDelete.push(mobileImagePath);
  }

  // Delete images from storage
  if (imagesToDelete.length > 0) {
    const { error: removeError } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET_HERO)
      .remove(imagesToDelete);

    if (removeError) {
      console.warn('Error removing images:', removeError.message);
      // Continue with database deletion even if storage removal fails
    }
  }

  // Delete from database
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
 * UPDATE Hero Banner Images (PC and/or Mobile)
 */
router.put('/update-hero-images/:id', upload.fields([
  { name: 'image', maxCount: 1 },      // PC image (optional)
  { name: 'mobile_image', maxCount: 1 } // Mobile image (optional)
]), async (req, res) => {
  const { id } = req.params;
  const pcImage = req.files?.image?.[0];
  const mobileImage = req.files?.mobile_image?.[0];

  if (!pcImage && !mobileImage) {
    return res.status(400).json({ error: 'At least one image (PC or mobile) is required' });
  }

  try {
    // Get existing banner data
    const { data: existingBanner, error: fetchError } = await supabase
      .from('hero_banners')
      .select('image_url, mobile_image_url')
      .eq('id', id)
      .single();

    if (fetchError || !existingBanner) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    let updateData = {};
    const imagesToDelete = [];

    // Handle PC Image Update
    if (pcImage) {
      const pcUniqueName = `${uuidv4()}-pc-${pcImage.originalname}`;
      const pcFilePath = `banners/${pcUniqueName}`;
      const pcFileBuffer = fs.readFileSync(pcImage.path);

      const { error: pcUploadError } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET_HERO)
        .upload(pcFilePath, pcFileBuffer, { contentType: pcImage.mimetype });

      fs.unlinkSync(pcImage.path);

      if (pcUploadError) {
        return res.status(500).json({ error: `PC image upload failed: ${pcUploadError.message}` });
      }

      const { data: pcUrlData } = supabase.storage
        .from(process.env.SUPABASE_BUCKET_HERO)
        .getPublicUrl(pcFilePath);

      updateData.image_url = pcUrlData.publicUrl;

      // Mark old PC image for deletion
      if (existingBanner.image_url) {
        const oldPcImagePath = existingBanner.image_url.split('/').slice(-2).join('/');
        imagesToDelete.push(oldPcImagePath);
      }
    }

    // Handle Mobile Image Update
    if (mobileImage) {
      const mobileUniqueName = `${uuidv4()}-mobile-${mobileImage.originalname}`;
      const mobileFilePath = `banners/${mobileUniqueName}`;
      const mobileFileBuffer = fs.readFileSync(mobileImage.path);

      const { error: mobileUploadError } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET_HERO)
        .upload(mobileFilePath, mobileFileBuffer, { contentType: mobileImage.mimetype });

      fs.unlinkSync(mobileImage.path);

      if (mobileUploadError) {
        return res.status(500).json({ error: `Mobile image upload failed: ${mobileUploadError.message}` });
      }

      const { data: mobileUrlData } = supabase.storage
        .from(process.env.SUPABASE_BUCKET_HERO)
        .getPublicUrl(mobileFilePath);

      updateData.mobile_image_url = mobileUrlData.publicUrl;

      // Mark old mobile image for deletion
      if (existingBanner.mobile_image_url) {
        const oldMobileImagePath = existingBanner.mobile_image_url.split('/').slice(-2).join('/');
        imagesToDelete.push(oldMobileImagePath);
      }
    }

    // Update database
    const { data, error: updateError } = await supabase
      .from('hero_banners')
      .update(updateData)
      .eq('id', id)
      .select();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    // Delete old images from storage
    if (imagesToDelete.length > 0) {
      const { error: removeError } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET_HERO)
        .remove(imagesToDelete);

      if (removeError) {
        console.warn('Error removing old images:', removeError.message);
        // Continue as the new images are already uploaded and database is updated
      }
    }

    return res.status(200).json({
      message: 'Banner images updated successfully',
      data: data[0]
    });

  } catch (err) {
    // Clean up any uploaded files in case of error
    if (pcImage && fs.existsSync(pcImage.path)) {
      fs.unlinkSync(pcImage.path);
    }
    if (mobileImage && fs.existsSync(mobileImage.path)) {
      fs.unlinkSync(mobileImage.path);
    }
    
    return res.status(500).json({ error: 'Failed to update images: ' + err.message });
  }
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
