

export interface RequestContext {
  requestId: string;
  ipAddress: string;
  userAgent: string | null;
  deviceId?: string;
  country?: string;
  deviceType?: 'mobile' | 'web' | 'tablet';
  timestamp?: Date;
}


export interface IDeviceInfo {
  deviceId: string;
  deviceType: 'mobile' | 'web' | 'tablet';
  deviceName?: string;
  osName?: string;
  osVersion?: string;
  appVersion?: string;
  browserName?: string;
  browserVersion?: string;
}