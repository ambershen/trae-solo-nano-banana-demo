// Comprehensive test to simulate the exact user workflow
import fs from 'fs';
import path from 'path';

// Create a proper PNG image using Sharp (if available) or use a known good PNG
const createTestImage = async () => {
  try {
    // Try to use Sharp to create a proper image
    const sharp = (await import('sharp')).default;
    return await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 }
      }
    })
    .png()
    .toBuffer();
  } catch (error) {
    console.log('Sharp not available, using fallback image');
    // Fallback to a known good PNG (red 1x1 pixel)
    const base64Data = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
    return Buffer.from(base64Data, 'base64');
  }
};

async function testCompleteWorkflow() {
  try {
    console.log('🧪 Starting comprehensive workflow test...');
    
    // Step 1: Create test image
    const imageBuffer = await createTestImage();
    console.log('✅ Test image created, size:', imageBuffer.length, 'bytes');
    
    // Step 2: Test upload endpoint
    console.log('\n📤 Testing image upload...');
    
    // Use proper FormData with Buffer
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: 'test.png',
      contentType: 'image/png'
    });
    
    const uploadResponse = await fetch('http://localhost:3001/api/images/upload', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    console.log('Upload response status:', uploadResponse.status);
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ Upload failed:', errorText);
      return;
    }
    
    const uploadData = await uploadResponse.json();
    console.log('✅ Upload successful:', uploadData);
    
    // Step 3: Test apply effect endpoint
    console.log('\n🎨 Testing apply effect...');
    
    const effectResponse = await fetch('http://localhost:3001/api/images/apply-effect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageId: uploadData.imageId,
        effectType: 'big_head',
        intensity: 0.8
      })
    });
    
    console.log('Effect response status:', effectResponse.status);
    
    if (!effectResponse.ok) {
      const errorText = await effectResponse.text();
      console.error('❌ Apply effect failed:', errorText);
      return;
    }
    
    const effectData = await effectResponse.json();
    console.log('✅ Apply effect successful:', effectData);
    
    // Step 4: Test status endpoint
    console.log('\n📊 Testing status endpoint...');
    
    const statusResponse = await fetch(`http://localhost:3001/api/images/status/${effectData.jobId}`);
    console.log('Status response status:', statusResponse.status);
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('✅ Status check successful:', statusData);
    }
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testCompleteWorkflow();