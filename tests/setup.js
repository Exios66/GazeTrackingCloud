// Mock browser APIs and global objects

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock document methods
document.createElement = jest.fn().mockImplementation((tag) => {
  const element = {
    style: {},
    setAttribute: jest.fn(),
    appendChild: jest.fn(),
    click: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(),
    getElementsByTagName: jest.fn(),
    getElementsByClassName: jest.fn(),
    getElementById: jest.fn(),
    remove: jest.fn(),
    tagName: tag.toUpperCase(),
    nodeName: tag.toUpperCase(),
    children: [],
    innerHTML: '',
    textContent: '',
    className: '',
    id: '',
  };
  return element;
});

// Instead of replacing document.body, we'll mock its methods
document.body.appendChild = jest.fn();
document.body.removeChild = jest.fn();
document.body.querySelector = jest.fn();
document.body.querySelectorAll = jest.fn();
document.body.getElementsByTagName = jest.fn();
document.body.getElementsByClassName = jest.fn();

// Instead of replacing document.head, we'll mock its methods
document.head.appendChild = jest.fn();
document.head.removeChild = jest.fn();
document.head.querySelector = jest.fn();
document.head.querySelectorAll = jest.fn();
document.head.getElementsByTagName = jest.fn();
document.head.getElementsByClassName = jest.fn();

// Mock GazeCloudAPI
global.GazeCloudAPI = {
  StartEyeTracking: jest.fn(),
  StopEyeTracking: jest.fn(),
  SetVideoContainerElement: jest.fn(),
  UseClickRecalibration: true,
  OnResult: null,
  OnCalibrationComplete: null,
  OnCamDenied: null,
  OnError: null,
};

// Mock console methods
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Mock localStorage
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock sessionStorage
global.sessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock IndexedDB
const indexedDB = {
  open: jest.fn().mockReturnValue({
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
  }),
  deleteDatabase: jest.fn(),
};

global.indexedDB = indexedDB;

// Mock Blob
global.Blob = function (content, options) {
  return {
    content,
    options,
    size: 0,
    type: options?.type || '',
  };
};

// Mock MutationObserver
global.MutationObserver = class {
  constructor(callback) {
    this.callback = callback;
    this.observe = jest.fn();
    this.disconnect = jest.fn();
    this.takeRecords = jest.fn();
  }
};

// Mock Date methods
const originalDate = global.Date;
global.Date = class extends originalDate {
  constructor(...args) {
    if (args.length === 0) {
      return new originalDate(1646735000000); // March 8, 2022, 10:30:00 AM UTC
    }
    return new originalDate(...args);
  }
  
  static now() {
    return 1646735000000; // March 8, 2022, 10:30:00 AM UTC
  }
  
  toISOString() {
    return '2022-03-08T10:30:00.000Z';
  }
};

// Mock GazeDB
global.GazeDB = {
  init: jest.fn().mockResolvedValue(true),
  createSession: jest.fn().mockResolvedValue('test-session-id'),
  endSession: jest.fn().mockResolvedValue(true),
  getSessionData: jest.fn().mockResolvedValue([]),
  saveGazeData: jest.fn().mockResolvedValue(true),
  getAllSessions: jest.fn().mockResolvedValue([]),
  deleteSession: jest.fn().mockResolvedValue(true),
};

// Mock GazeHeatmap
global.GazeHeatmap = {
  init: jest.fn(),
  addGazePoint: jest.fn(),
  show: jest.fn(),
  hide: jest.fn(),
  clear: jest.fn(),
  exportAsImage: jest.fn().mockReturnValue('mock-image-data'),
  saveAsImage: jest.fn(),
  generateFromData: jest.fn(),
  generateSummary: jest.fn().mockReturnValue({
    pointCount: 100,
    averageValue: 0.5,
    maxValue: 1.0,
    coverage: 25,
  }),
}; 