import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function testCompleteWorkflow() {
  try {
    console.log('=== Testing Complete Workflow ===');
    
    // Step 1: Upload image
    console.log('\n1. Uploading image...');
    
    const form = new FormData();
    form.append('image', fs.createReadStream('test-image.png'));
    
    const uploadResponse = await fetch('http://localhost:3001/api/images/upload', {
      method: 'POST',
      body: form
    });
    
    const uploadResult = await uploadResponse.json();
    console.log('Upload response:', uploadResult);
    
    if (!uploadResult.success) {
      throw new Error('Upload failed: ' + uploadResult.error);
    }
    
    const imageId = uploadResult.imageId;
    console.log('✅ Upload successful! ImageId:', imageId);
    
    // Step 2: Apply effect
    console.log('\n2. Applying effect...');
    
    const effectResponse = await fetch('http://localhost:3001/api/images/apply-effect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageId: imageId,
        effectType: 'big_head',
        intensity: 0.8
      })
    });
    
    const effectResult = await effectResponse.json();
    console.log('Effect response:', effectResult);
    
    if (!effectResult.success) {
      throw new Error('Effect failed: ' + effectResult.error);
    }
    
    const jobId = effectResult.jobId;
    console.log('✅ Effect processing started! JobId:', jobId);
    
    // Step 3: Check status
    console.log('\n3. Checking processing status...');
    
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      
      const statusResponse = await fetch(`http://localhost:3001/api/images/status/${jobId}`);
      const statusResult = await statusResponse.json();
      
      console.log(`Status check ${attempts + 1}:`, statusResult);
      
      if (statusResult.status === 'completed') {
        console.log('✅ Processing completed successfully!');
        console.log('Result URL:', statusResult.resultUrl);
        break;
      } else if (statusResult.status === 'failed') {
        console.log('❌ Processing failed:', statusResult.error);
        break;
      }
      
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      console.log('⏰ Processing timed out after', maxAttempts * 3, 'seconds');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCompleteWorkflow();