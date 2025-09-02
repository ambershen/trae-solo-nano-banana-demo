// Simple test script to verify the API endpoints

// Test the apply effect endpoint with mock data
async function testAPI() {
  try {
    console.log('Testing apply effect endpoint...');
    
    // Test: Apply effect with mock imageId
    console.log('Testing apply effect with mock data...');
    const effectResponse = await fetch('http://localhost:3001/api/images/apply-effect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageId: 'test-image-id',
        effectType: 'big_head',
        intensity: 0.8
      })
    });
    
    console.log('Response status:', effectResponse.status);
    const responseText = await effectResponse.text();
    console.log('Response body:', responseText);
    
    if (effectResponse.ok) {
      console.log('✅ Apply effect endpoint is working!');
    } else {
      console.log('❌ Apply effect endpoint returned error:', effectResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAPI();