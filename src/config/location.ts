// 位置服务配置
export const LOCATION_CONFIG = {
  // 高德地图Web服务API密钥
  // 申请地址: https://console.amap.com/dev/key/app
  // 免费版每日配额: 100万次调用
  AMAP_WEB_KEY: import.meta.env.VITE_AMAP_WEB_KEY || '',

  // 高德地图JavaScript API密钥（用于地图显示）
  AMAP_JS_KEY: import.meta.env.VITE_AMAP_JS_KEY || '',

  // 高德地图JavaScript API安全密钥（securityJsCode）
  AMAP_SECURITY_CODE: import.meta.env.VITE_AMAP_SECURITY_CODE || '',

  // 是否启用高德地图API
  ENABLE_AMAP: true,

  // 是否启用离线模式作为备用
  ENABLE_OFFLINE_FALLBACK: true,

  // API超时时间（毫秒）
  API_TIMEOUT: 10000,

  // 地理编码精度半径（米）
  GEOCODE_RADIUS: 1000
};

// 检查API密钥是否已配置
export const isAmapConfigured = () => {
  return LOCATION_CONFIG.AMAP_WEB_KEY &&
         LOCATION_CONFIG.AMAP_WEB_KEY !== '' &&
         LOCATION_CONFIG.AMAP_WEB_KEY !== 'your_amap_key_here';
};

// 检查JavaScript API密钥是否已配置
export const isAmapJSConfigured = () => {
  const jsKey = LOCATION_CONFIG.AMAP_JS_KEY;
  const securityCode = LOCATION_CONFIG.AMAP_SECURITY_CODE;

  // 检查JS API密钥
  const hasJSKey = jsKey &&
                   jsKey !== '' &&
                   jsKey !== 'your_amap_js_key_here';

  // 检查安全密钥
  const hasSecurityCode = securityCode &&
                          securityCode !== '' &&
                          securityCode !== 'your_security_code_here';

  return hasJSKey && hasSecurityCode;
};

// 获取高德地图逆地理编码URL
export const getAmapRegeoUrl = (lng: number, lat: number) => {
  const params = new URLSearchParams({
    key: LOCATION_CONFIG.AMAP_WEB_KEY,
    location: `${lng},${lat}`,
    radius: LOCATION_CONFIG.GEOCODE_RADIUS.toString(),
    extensions: 'all',
    batch: 'false',
    roadlevel: '0'
  });
  
  return `https://restapi.amap.com/v3/geocode/regeo?${params.toString()}`;
};
