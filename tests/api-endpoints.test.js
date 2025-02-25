/**
 * Tests for API endpoints
 */

// Mock fetch for testing API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
    text: () => Promise.resolve('Success'),
  })
);

// Mock the document.getElementById function to return mock elements
document.getElementById = jest.fn().mockImplementation((id) => {
  switch (id) {
    case 'gaze-x':
      return { textContent: '' };
    case 'gaze-y':
      return { textContent: '' };
    case 'head-x':
      return { textContent: '' };
    case 'head-y':
      return { textContent: '' };
    case 'head-z':
      return { textContent: '' };
    case 'session-duration':
      return { textContent: '' };
    case 'data-points':
      return { textContent: '' };
    case 'video-container':
      return { 
        innerHTML: '',
        appendChild: jest.fn(),
        children: []
      };
    case 'api-status-indicator':
      return { 
        style: { backgroundColor: '' },
        textContent: ''
      };
    default:
      return {
        textContent: '',
        style: {}
      };
  }
});

describe('API Endpoint Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset fetch mock
    fetch.mockClear();
  });
  
  test('API endpoint /api/status should return success', async () => {
    // Make a request to the API endpoint
    const response = await fetch('/api/status');
    
    // Check that fetch was called with the correct URL
    expect(fetch).toHaveBeenCalledWith('/api/status');
    
    // Check that the response is as expected
    expect(await response.json()).toEqual({ success: true });
  });
  
  test('API endpoint /api/sessions should return success', async () => {
    // Make a request to the API endpoint
    const response = await fetch('/api/sessions');
    
    // Check that fetch was called with the correct URL
    expect(fetch).toHaveBeenCalledWith('/api/sessions');
    
    // Check that the response is as expected
    expect(await response.json()).toEqual({ success: true });
  });
  
  test('API endpoint /api/sessions/:id should return success', async () => {
    // Make a request to the API endpoint
    const response = await fetch('/api/sessions/123');
    
    // Check that fetch was called with the correct URL
    expect(fetch).toHaveBeenCalledWith('/api/sessions/123');
    
    // Check that the response is as expected
    expect(await response.json()).toEqual({ success: true });
  });
  
  test('API endpoint /api/sessions/:id/data should return success', async () => {
    // Make a request to the API endpoint
    const response = await fetch('/api/sessions/123/data');
    
    // Check that fetch was called with the correct URL
    expect(fetch).toHaveBeenCalledWith('/api/sessions/123/data');
    
    // Check that the response is as expected
    expect(await response.json()).toEqual({ success: true });
  });
  
  test('API endpoint /api/sessions/:id/csv should return success', async () => {
    // Make a request to the API endpoint
    const response = await fetch('/api/sessions/123/csv');
    
    // Check that fetch was called with the correct URL
    expect(fetch).toHaveBeenCalledWith('/api/sessions/123/csv');
    
    // Check that the response is as expected
    expect(await response.text()).toEqual('Success');
  });
}); 