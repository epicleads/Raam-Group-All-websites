const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET_NAME = process.env.SUPABASE_BUCKET_GROUP_TEAM || 'group-team-media';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * ✅ Add new team member
 * @param {object} memberData
 * @param {string} filePath - Local path of uploaded image
 */
async function addTeamMember(memberData, filePath) {
  try {
    let imageUrl = null;

    // Upload image if provided
    if (filePath) {
      const fileExt = path.extname(filePath);
      const fileName = `${Date.now()}_${path.basename(filePath)}`;
      const fileBuffer = fs.readFileSync(filePath);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, fileBuffer, {
          contentType: `image/${fileExt.replace('.', '')}`,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

      imageUrl = publicUrlData.publicUrl;
    }

    // Insert into Supabase table
    const { data, error } = await supabase.from('group_team').insert([
      {
        full_name: memberData.full_name,
        designation: memberData.designation,
        brand: memberData.brand,
        department: memberData.department,
        bio: memberData.bio,
        image_url: imageUrl,
        linkedin_url: memberData.linkedin_url,
      },
    ]);

    if (error) throw error;

    console.log('✅ Team member added successfully:', data);
    return data;
  } catch (err) {
    console.error('❌ Error adding team member:', err.message);
  }
}

/**
 * 📥 Get all team members
 */
async function getAllTeamMembers() {
  try {
    const { data, error } = await supabase
      .from('group_team')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('❌ Error fetching team members:', err.message);
  }
}

/**
 * 🔍 Get single team member by ID
 */
async function getTeamMemberById(id) {
  try {
    const { data, error } = await supabase
      .from('group_team')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('❌ Error fetching team member:', err.message);
  }
}

/**
 * ✏️ Update team member
 */
async function updateTeamMember(id, updatedData, newFilePath = null) {
  try {
    let newImageUrl = updatedData.image_url;

    // If new image uploaded
    if (newFilePath) {
      const fileExt = path.extname(newFilePath);
      const fileName = `${Date.now()}_${path.basename(newFilePath)}`;
      const fileBuffer = fs.readFileSync(newFilePath);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, fileBuffer, {
          contentType: `image/${fileExt.replace('.', '')}`,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

      newImageUrl = publicUrlData.publicUrl;
    }

    const { data, error } = await supabase
      .from('group_team')
      .update({ ...updatedData, image_url: newImageUrl })
      .eq('id', id);

    if (error) throw error;
    console.log('✅ Team member updated successfully');
    return data;
  } catch (err) {
    console.error('❌ Error updating team member:', err.message);
  }
}

/**
 * 🗑️ Delete team member (and image if exists)
 */
async function deleteTeamMember(id) {
  try {
    // Get the member’s image before deleting
    const { data: member } = await supabase
      .from('group_team')
      .select('image_url')
      .eq('id', id)
      .single();

    // Delete from table
    const { error } = await supabase.from('group_team').delete().eq('id', id);
    if (error) throw error;

    // Delete image if exists
    if (member?.image_url) {
      const imageName = member.image_url.split('/').pop();
      await supabase.storage.from(BUCKET_NAME).remove([imageName]);
    }

    console.log('✅ Team member deleted successfully');
  } catch (err) {
    console.error('❌ Error deleting team member:', err.message);
  }
}

// Export all functions
module.exports = {
  addTeamMember,
  getAllTeamMembers,
  getTeamMemberById,
  updateTeamMember,
  deleteTeamMember,
};
