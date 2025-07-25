import React, { useState } from 'react';
import { MapPin, Loader, X, Navigation, Map, Target } from 'lucide-react';
import { LocationInfo } from '../types';
import { useThemeContext } from './ThemeProvider';
import { LOCATION_CONFIG, isAmapConfigured, getAmapRegeoUrl } from '../config/location';
import { MapLocationPicker } from './MapLocationPicker';
import { wgs84ToGcj02, getHighAccuracyLocation } from '../utils/coordinateUtils';

interface LocationPickerProps {
  location: LocationInfo | null;
  onLocationChange: (location: LocationInfo | null) => void;
  disabled?: boolean;
}

export function LocationPicker({ location, onLocationChange, disabled }: LocationPickerProps) {
  const { theme } = useThemeContext();
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [manualLocation, setManualLocation] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // 获取当前位置
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError('浏览器不支持地理定位');
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5分钟缓存
        });
      });

      const { latitude, longitude, accuracy } = position.coords;

      // 🔧 坐标系转换：GPS(WGS84) -> 高德地图(GCJ02)
      const gcj02Result = wgs84ToGcj02(latitude, longitude);
      const convertedLat = gcj02Result.latitude;
      const convertedLng = gcj02Result.longitude;

      // 输出调试信息
      console.log('📍 GPS定位成功 (LocationPicker):');
      console.log('  原始GPS坐标 (WGS84):', { latitude, longitude });
      console.log('  转换后坐标 (GCJ02):', { latitude: convertedLat, longitude: convertedLng });
      console.log('  坐标偏移距离:', `${gcj02Result.offset?.distance.toFixed(1)}米`);
      console.log('  GPS精度:', accuracy ? `${accuracy.toFixed(1)}米` : '未知');

      // 获取详细的位置信息 (使用转换后的坐标)
      try {
        const locationInfo = await getDetailedLocationInfo(convertedLat, convertedLng);
        // 保存原始GPS坐标用于调试
        (locationInfo as any).originalGPS = { latitude, longitude };
        (locationInfo as any).coordinateOffset = gcj02Result.offset;
        onLocationChange(locationInfo);
      } catch (geocodeError) {
        console.error('地理编码失败，使用坐标作为位置名称:', geocodeError);

        // 提供离线模式的基本位置信息 (使用转换后的坐标)
        const offlineLocationInfo = createSmartOfflineLocation(convertedLat, convertedLng);
        // 保存原始GPS坐标用于调试
        (offlineLocationInfo as any).originalGPS = { latitude, longitude };
        (offlineLocationInfo as any).coordinateOffset = gcj02Result.offset;
        onLocationChange(offlineLocationInfo);

        // 显示友好的成功信息，根据失败原因提供不同提示
        let message = '✅ 已智能识别位置信息！';
        const errorMessage = geocodeError instanceof Error ? geocodeError.message : String(geocodeError);
        if (errorMessage.includes('USERKEY_PLAT_NOMATCH')) {
          message += ' 高德地图API配置需要调整，当前使用离线模式。';
        } else {
          message += ' 由于网络限制，使用了离线模式。';
        }
        setLocationError(message);
        setTimeout(() => setLocationError(null), 6000);
      }
    } catch (error) {
      let errorMessage = '获取位置失败';
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '位置访问被拒绝，请在浏览器设置中允许位置访问';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '位置信息不可用';
            break;
          case error.TIMEOUT:
            errorMessage = '获取位置超时';
            break;
        }
      }
      setLocationError(errorMessage);
    } finally {
      setIsGettingLocation(false);
    }
  };

  // 高精度定位功能
  const getHighAccuracyLocationInfo = async () => {
    if (isGettingLocation) return;

    setIsGettingLocation(true);
    setLocationError(null);

    try {
      console.log('🎯 开始高精度定位...');

      // 使用高精度定位策略
      const highAccuracyResult = await getHighAccuracyLocation({
        maxAttempts: 3,
        timeout: 12000,
        acceptableAccuracy: 30, // 目标精度30米
        targetSystem: 'GCJ02'
      });

      console.log('🎯 高精度定位完成:', highAccuracyResult);

      // 获取详细的位置信息
      try {
        const locationInfo = await getDetailedLocationInfo(
          highAccuracyResult.latitude,
          highAccuracyResult.longitude
        );

        // 添加高精度定位的额外信息
        (locationInfo as any).highAccuracy = {
          accuracy: highAccuracyResult.accuracy,
          confidence: highAccuracyResult.confidence,
          attempts: highAccuracyResult.attempts,
          coordinateOffset: highAccuracyResult.offset
        };

        onLocationChange(locationInfo);

        // 显示成功信息
        const successMessage = `✅ 高精度定位成功！精度: ${highAccuracyResult.accuracy?.toFixed(1)}米，置信度: ${highAccuracyResult.confidence}`;
        setLocationError(successMessage);
        setTimeout(() => setLocationError(null), 8000);

      } catch (geocodeError) {
        console.error('地理编码失败，使用坐标作为位置名称:', geocodeError);

        // 提供离线模式的基本位置信息
        const offlineLocationInfo = createSmartOfflineLocation(
          highAccuracyResult.latitude,
          highAccuracyResult.longitude
        );

        // 添加高精度定位信息
        (offlineLocationInfo as any).highAccuracy = {
          accuracy: highAccuracyResult.accuracy,
          confidence: highAccuracyResult.confidence,
          attempts: highAccuracyResult.attempts,
          coordinateOffset: highAccuracyResult.offset
        };

        onLocationChange(offlineLocationInfo);

        const message = `✅ 高精度定位完成！精度: ${highAccuracyResult.accuracy?.toFixed(1)}米，使用离线模式识别位置。`;
        setLocationError(message);
        setTimeout(() => setLocationError(null), 8000);
      }

    } catch (error) {
      console.error('高精度定位失败:', error);
      let errorMessage = '高精度定位失败';
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '位置访问被拒绝，请在浏览器设置中允许位置访问';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '位置信息不可用，请确保GPS信号良好';
            break;
          case error.TIMEOUT:
            errorMessage = '高精度定位超时，请在信号更好的地方重试';
            break;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      setLocationError(errorMessage);
    } finally {
      setIsGettingLocation(false);
    }
  };

  // 获取详细的位置信息，使用高德地图API
  const getDetailedLocationInfo = async (lat: number, lng: number) => {
    console.log('开始获取位置信息:', lat, lng);

    // 优先使用高德地图API（最准确）
    try {
      const amapLocationInfo = await tryAmapGeocoding(lat, lng);
      if (amapLocationInfo) {
        console.log('高德地图地理编码成功:', amapLocationInfo);
        return amapLocationInfo;
      }
    } catch (error) {
      console.log('高德地图API失败:', error);
    }

    // 备用：尝试使用浏览器的内置地理编码
    try {
      const browserLocationInfo = await tryBrowserGeocoding(lat, lng);
      if (browserLocationInfo) {
        console.log('使用浏览器地理编码成功:', browserLocationInfo);
        return browserLocationInfo;
      }
    } catch (error) {
      console.log('浏览器地理编码不可用:', error);
    }

    // 备用：尝试使用OpenStreetMap JSONP方式
    try {
      console.log('尝试使用OpenStreetMap JSONP方式...');
      const locationInfo = await tryJSONPGeocoding(lat, lng);
      if (locationInfo) {
        console.log('OpenStreetMap地理编码成功:', locationInfo);
        return locationInfo;
      }
    } catch (error) {
      console.error('OpenStreetMap服务失败:', error);
    }

    // 所有在线服务都失败，使用智能离线模式
    console.log('所有在线服务失败，使用智能离线模式');
    return createSmartOfflineLocation(lat, lng);
  };

  // 使用高德地图API进行地理编码
  const tryAmapGeocoding = async (lat: number, lng: number) => {
    try {
      // 检查是否启用高德地图API
      if (!LOCATION_CONFIG.ENABLE_AMAP) {
        console.log('高德地图API已禁用');
        return null;
      }

      // 检查API密钥是否已配置
      if (!isAmapConfigured()) {
        console.log('高德地图API密钥未配置，跳过');
        return null;
      }

      // 获取高德地图逆地理编码URL
      const url = getAmapRegeoUrl(lng, lat);
      console.log('调用高德地图API:', url);

      // 创建带超时的fetch请求
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), LOCATION_CONFIG.API_TIMEOUT);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`高德地图API响应错误: ${response.status}`);
      }

      const data = await response.json();
      console.log('高德地图API响应:', data);

      if (data.status !== '1' || !data.regeocode) {
        const errorMsg = data.info || '未知错误';
        console.warn(`高德地图API错误: ${errorMsg} (错误码: ${data.infocode})`);

        // 提供更友好的错误信息
        if (data.infocode === '10009') {
          console.warn('API密钥配置问题：请确保在高德控制台中将服务平台设置为"Web服务"');
        }

        throw new Error(`高德地图API返回错误: ${errorMsg}`);
      }

      const regeocode = data.regeocode;
      const addressComponent = regeocode.addressComponent;
      const formattedAddress = regeocode.formatted_address;

      // 构建位置信息
      const locationName = getAmapLocationName(addressComponent, formattedAddress);

      return {
        name: locationName,
        latitude: lat,
        longitude: lng,
        address: formattedAddress,
        details: {
          building: addressComponent.building?.name,
          neighborhood: addressComponent.neighborhood?.name,
          township: addressComponent.township?.name,
          street: addressComponent.streetNumber?.street,
          streetNumber: addressComponent.streetNumber?.number,
          district: addressComponent.district,
          city: addressComponent.city,
          province: addressComponent.province,
          country: '中国'
        }
      };
    } catch (error) {
      console.error('高德地图API调用失败:', error);
      return null;
    }
  };

  // 从高德地图数据中智能选择位置名称
  const getAmapLocationName = (addressComponent: any, formattedAddress: string) => {
    // 优先级：建筑物 > 小区 > 街道+门牌号 > 乡镇 > 区县
    if (addressComponent.building?.name) {
      return addressComponent.building.name;
    }

    if (addressComponent.neighborhood?.name) {
      return addressComponent.neighborhood.name;
    }

    if (addressComponent.streetNumber?.street && addressComponent.streetNumber?.number) {
      return `${addressComponent.streetNumber.street}${addressComponent.streetNumber.number}号`;
    }

    if (addressComponent.streetNumber?.street) {
      return addressComponent.streetNumber.street;
    }

    if (addressComponent.township?.name) {
      return addressComponent.township.name;
    }

    if (addressComponent.district) {
      return `${addressComponent.city || ''}${addressComponent.district}`;
    }

    // 如果都没有，从格式化地址中提取第一部分
    if (formattedAddress) {
      const parts = formattedAddress.split(/[省市区县]/);
      if (parts.length > 1) {
        return parts[parts.length - 1].trim();
      }
    }

    return '未知位置';
  };

  // 尝试使用浏览器内置的地理编码
  const tryBrowserGeocoding = async (_lat: number, _lng: number) => {
    // 检查是否有可用的浏览器地理编码API
    if (typeof window !== 'undefined' && 'google' in window && (window as any).google?.maps) {
      // 如果页面加载了Google Maps，可以使用其地理编码服务
      // 这里暂时返回null，因为我们没有加载Google Maps
      return null;
    }
    return null;
  };

  // 尝试使用JSONP方式避免CORS问题
  const tryJSONPGeocoding = async (lat: number, lng: number) => {
    return new Promise((resolve) => {
      // 创建一个唯一的回调函数名
      const callbackName = `geocodeCallback_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // 设置超时
      const timeout = setTimeout(() => {
        cleanup();
        resolve(null);
      }, 10000);

      const cleanup = () => {
        clearTimeout(timeout);
        if ((window as any)[callbackName]) {
          delete (window as any)[callbackName];
        }
        const script = document.getElementById(callbackName);
        if (script) {
          script.remove();
        }
      };

      // 定义回调函数
      (window as any)[callbackName] = (data: any) => {
        cleanup();
        try {
          if (data && data.display_name) {
            const address = data.address || {};
            const locationInfo = {
              name: getLocationName(data, address),
              address: data.display_name,
              latitude: lat,
              longitude: lng,
              nearbyPOIs: [], // JSONP模式下不获取POI
              details: {
                building: address.building,
                house_number: address.house_number,
                road: address.road,
                neighbourhood: address.neighbourhood,
                suburb: address.suburb,
                city: address.city || address.town || address.village,
                state: address.state,
                country: address.country
              }
            };
            resolve(locationInfo);
          } else {
            resolve(null);
          }
        } catch (error) {
          console.error('JSONP回调处理错误:', error);
          resolve(null);
        }
      };

      // 创建script标签
      const script = document.createElement('script');
      script.id = callbackName;
      script.src = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=zh-CN,zh,en&json_callback=${callbackName}`;
      script.onerror = () => {
        cleanup();
        resolve(null);
      };

      document.head.appendChild(script);
    });
  };





  // 智能选择位置名称
  const getLocationName = (data: any, address: any) => {
    console.log('选择位置名称，数据:', { data, address });

    // 如果有display_name，先尝试从中提取有用信息
    if (data.display_name) {
      const parts = data.display_name.split(',').map((part: string) => part.trim());
      console.log('地址部分:', parts);

      // 对于中国地址，通常第一部分是最具体的位置
      if (parts.length > 0 && parts[0] && parts[0] !== data.lat && parts[0] !== data.lon) {
        // 过滤掉纯数字（可能是门牌号）
        const firstPart = parts[0];
        if (!/^\d+$/.test(firstPart)) {
          return firstPart;
        }
      }
    }

    // 优先级：建筑名 > 商店名 > 兴趣点名称 > 道路+门牌号 > 道路名 > 社区名
    if (address.building) {
      console.log('使用建筑名:', address.building);
      return address.building;
    }

    if (address.shop) {
      console.log('使用商店名:', address.shop);
      return address.shop;
    }

    if (address.amenity) {
      console.log('使用设施名:', address.amenity);
      return address.amenity;
    }

    if (data.name) {
      console.log('使用数据名称:', data.name);
      return data.name;
    }

    if (data.namedetails?.name) {
      console.log('使用详细名称:', data.namedetails.name);
      return data.namedetails.name;
    }

    if (address.house_number && address.road) {
      const roadAddress = `${address.road}${address.house_number}号`;
      console.log('使用道路+门牌号:', roadAddress);
      return roadAddress;
    }

    if (address.road) {
      console.log('使用道路名:', address.road);
      return address.road;
    }

    if (address.neighbourhood) {
      console.log('使用社区名:', address.neighbourhood);
      return address.neighbourhood;
    }

    if (address.suburb) {
      console.log('使用区域名:', address.suburb);
      return address.suburb;
    }

    if (address.city || address.town || address.village) {
      const cityName = address.city || address.town || address.village;
      console.log('使用城市名:', cityName);
      return cityName;
    }

    console.log('无法确定位置名称，使用默认');
    return '未知位置';
  };

  // 手动添加位置
  const handleManualLocation = () => {
    const locationName = manualLocation.trim();
    if (locationName) {
      onLocationChange({
        name: locationName,
        address: locationName
      });
      setManualLocation('');
      setShowManualInput(false);
    }
  };

  // 创建智能离线位置信息
  const createSmartOfflineLocation = (lat: number, lng: number) => {
    console.log('创建智能离线位置信息:', lat, lng);

    // 更详细的中国城市和地区数据库
    const locationDatabase = [
      // 上海市各区详细坐标
      { name: '上海', type: '直辖市', lat: [31.0, 31.5], lng: [121.2, 121.8],
        districts: [
          { name: '黄浦区', lat: [31.220, 31.240], lng: [121.470, 121.500] },
          { name: '徐汇区', lat: [31.170, 31.220], lng: [121.420, 121.470] },
          { name: '长宁区', lat: [31.200, 31.240], lng: [121.380, 121.440] },
          { name: '静安区', lat: [31.220, 31.260], lng: [121.440, 121.480] },
          { name: '普陀区', lat: [31.230, 31.280], lng: [121.380, 121.440] },
          { name: '虹口区', lat: [31.250, 31.290], lng: [121.480, 121.520] },
          { name: '杨浦区', lat: [31.260, 31.320], lng: [121.500, 121.580] },
          { name: '闵行区', lat: [31.020, 31.120], lng: [121.300, 121.480] }, // 您的位置应该在这里
          { name: '宝山区', lat: [31.300, 31.420], lng: [121.440, 121.540] },
          { name: '嘉定区', lat: [31.350, 31.420], lng: [121.200, 121.300] },
          { name: '浦东新区', lat: [31.150, 31.350], lng: [121.500, 121.900] },
          { name: '金山区', lat: [30.720, 30.900], lng: [121.200, 121.400] },
          { name: '松江区', lat: [31.000, 31.120], lng: [121.180, 121.280] },
          { name: '青浦区', lat: [31.100, 31.200], lng: [121.000, 121.200] },
          { name: '奉贤区', lat: [30.900, 31.050], lng: [121.400, 121.600] },
          { name: '崇明区', lat: [31.600, 31.850], lng: [121.300, 121.950] }
        ]
      },
      { name: '北京', type: '直辖市', lat: [39.7, 40.2], lng: [116.0, 116.8], districts: ['东城区', '西城区', '朝阳区', '丰台区', '石景山区', '海淀区', '门头沟区', '房山区'] },
      { name: '天津', type: '直辖市', lat: [38.8, 39.4], lng: [116.8, 117.8], districts: ['和平区', '河东区', '河西区', '南开区', '河北区', '红桥区'] },
      { name: '重庆', type: '直辖市', lat: [29.0, 30.2], lng: [106.0, 108.0], districts: ['渝中区', '大渡口区', '江北区', '沙坪坝区', '九龙坡区', '南岸区'] },

      // 省会城市
      { name: '广州', type: '省会', lat: [22.8, 23.6], lng: [113.0, 113.8], districts: ['越秀区', '海珠区', '荔湾区', '天河区', '白云区', '黄埔区'] },
      { name: '深圳', type: '特区', lat: [22.4, 22.9], lng: [113.7, 114.6], districts: ['罗湖区', '福田区', '南山区', '宝安区', '龙岗区', '盐田区'] },
      { name: '杭州', type: '省会', lat: [30.0, 30.6], lng: [119.8, 120.5], districts: ['上城区', '下城区', '江干区', '拱墅区', '西湖区', '滨江区'] },
      { name: '南京', type: '省会', lat: [31.8, 32.4], lng: [118.4, 119.2], districts: ['玄武区', '秦淮区', '建邺区', '鼓楼区', '浦口区', '栖霞区'] },
      { name: '武汉', type: '省会', lat: [30.2, 31.0], lng: [113.8, 114.8], districts: ['江岸区', '江汉区', '硚口区', '汉阳区', '武昌区', '青山区'] },
      { name: '成都', type: '省会', lat: [30.3, 31.0], lng: [103.7, 104.5], districts: ['锦江区', '青羊区', '金牛区', '武侯区', '成华区', '龙泉驿区'] },
      { name: '西安', type: '省会', lat: [34.0, 34.5], lng: [108.6, 109.2], districts: ['新城区', '碑林区', '莲湖区', '灞桥区', '未央区', '雁塔区'] },
      { name: '郑州', type: '省会', lat: [34.5, 35.0], lng: [113.3, 114.0], districts: ['中原区', '二七区', '管城区', '金水区', '上街区', '惠济区'] },
      { name: '济南', type: '省会', lat: [36.4, 37.0], lng: [116.8, 117.4], districts: ['历下区', '市中区', '槐荫区', '天桥区', '历城区', '长清区'] },
      { name: '沈阳', type: '省会', lat: [41.6, 42.0], lng: [123.2, 123.8], districts: ['和平区', '沈河区', '大东区', '皇姑区', '铁西区', '苏家屯区'] },
      { name: '长春', type: '省会', lat: [43.6, 44.2], lng: [125.0, 125.6], districts: ['南关区', '宽城区', '朝阳区', '二道区', '绿园区', '双阳区'] },
      { name: '哈尔滨', type: '省会', lat: [45.5, 46.0], lng: [126.3, 127.0], districts: ['道里区', '道外区', '南岗区', '香坊区', '动力区', '平房区'] },
      { name: '昆明', type: '省会', lat: [24.7, 25.2], lng: [102.4, 103.0], districts: ['五华区', '盘龙区', '官渡区', '西山区', '东川区', '呈贡区'] },
      { name: '南昌', type: '省会', lat: [28.4, 29.0], lng: [115.6, 116.2], districts: ['东湖区', '西湖区', '青云谱区', '湾里区', '青山湖区', '新建区'] },
      { name: '福州', type: '省会', lat: [25.8, 26.4], lng: [119.0, 119.6], districts: ['鼓楼区', '台江区', '仓山区', '马尾区', '晋安区', '长乐区'] },
      { name: '合肥', type: '省会', lat: [31.6, 32.2], lng: [117.0, 117.6], districts: ['瑶海区', '庐阳区', '蜀山区', '包河区', '长丰县', '肥东县'] },
      { name: '石家庄', type: '省会', lat: [37.8, 38.4], lng: [114.2, 114.8], districts: ['长安区', '桥西区', '新华区', '井陉矿区', '裕华区', '藁城区'] },
      { name: '太原', type: '省会', lat: [37.6, 38.2], lng: [112.2, 112.8], districts: ['小店区', '迎泽区', '杏花岭区', '尖草坪区', '万柏林区', '晋源区'] },
      { name: '兰州', type: '省会', lat: [35.8, 36.4], lng: [103.4, 104.0], districts: ['城关区', '七里河区', '西固区', '安宁区', '红古区'] },
      { name: '银川', type: '省会', lat: [38.2, 38.8], lng: [106.0, 106.6], districts: ['兴庆区', '金凤区', '西夏区', '永宁县', '贺兰县'] },
      { name: '西宁', type: '省会', lat: [36.4, 37.0], lng: [101.4, 102.0], districts: ['城东区', '城中区', '城西区', '城北区'] },
      { name: '乌鲁木齐', type: '省会', lat: [43.6, 44.2], lng: [87.2, 88.0], districts: ['天山区', '沙依巴克区', '新市区', '水磨沟区', '头屯河区', '达坂城区'] },
      { name: '拉萨', type: '省会', lat: [29.4, 30.0], lng: [90.8, 91.4], districts: ['城关区', '堆龙德庆区', '达孜区', '林周县'] },
      { name: '呼和浩特', type: '省会', lat: [40.6, 41.2], lng: [111.4, 112.0], districts: ['新城区', '回民区', '玉泉区', '赛罕区'] },
      { name: '南宁', type: '省会', lat: [22.6, 23.2], lng: [108.0, 108.6], districts: ['兴宁区', '青秀区', '江南区', '西乡塘区', '良庆区', '邕宁区'] },
      { name: '海口', type: '省会', lat: [19.8, 20.4], lng: [110.0, 110.6], districts: ['秀英区', '龙华区', '琼山区', '美兰区'] },
      { name: '贵阳', type: '省会', lat: [26.3, 26.9], lng: [106.4, 107.0], districts: ['南明区', '云岩区', '花溪区', '乌当区', '白云区', '观山湖区'] }
    ];

    // 查找匹配的城市和具体区域
    let matchedLocation = null;
    let matchedDistrict = null;
    let bestMatch = null;
    let minDistance = Infinity;

    for (const location of locationDatabase) {
      // 首先检查是否在城市范围内
      if (lat >= location.lat[0] && lat <= location.lat[1] &&
          lng >= location.lng[0] && lng <= location.lng[1]) {
        matchedLocation = location;

        // 如果有详细的区域信息，尝试匹配具体区域
        if (Array.isArray(location.districts) && location.districts.length > 0 &&
            typeof location.districts[0] === 'object') {
          // 查找匹配的具体区域
          for (const district of location.districts as any[]) {
            if (district.lat && district.lng &&
                lat >= district.lat[0] && lat <= district.lat[1] &&
                lng >= district.lng[0] && lng <= district.lng[1]) {
              matchedDistrict = district;
              console.log(`精确匹配到区域: ${district.name}`);
              break;
            }
          }

          // 如果没有精确匹配到区域，找最近的区域
          if (!matchedDistrict) {
            let minDistrictDistance = Infinity;
            for (const district of location.districts as any[]) {
              if (district.lat && district.lng) {
                const centerLat = (district.lat[0] + district.lat[1]) / 2;
                const centerLng = (district.lng[0] + district.lng[1]) / 2;
                const distance = Math.sqrt(Math.pow(lat - centerLat, 2) + Math.pow(lng - centerLng, 2));

                if (distance < minDistrictDistance) {
                  minDistrictDistance = distance;
                  matchedDistrict = district;
                }
              }
            }
            console.log(`最近的区域: ${matchedDistrict?.name}, 距离: ${minDistrictDistance.toFixed(4)}`);
          }
        }
        break;
      }

      // 计算到城市中心的距离
      const centerLat = (location.lat[0] + location.lat[1]) / 2;
      const centerLng = (location.lng[0] + location.lng[1]) / 2;
      const distance = Math.sqrt(Math.pow(lat - centerLat, 2) + Math.pow(lng - centerLng, 2));

      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = location;
      }
    }

    // 如果没有精确匹配，使用最近的城市（如果距离合理）
    if (!matchedLocation && bestMatch && minDistance < 1.0) { // 约100公里内
      matchedLocation = bestMatch;
    }

    let locationName, fullAddress, details;

    if (matchedLocation) {
      let districtName;

      if (matchedDistrict) {
        // 使用精确匹配的区域
        districtName = matchedDistrict.name;
      } else if (Array.isArray(matchedLocation.districts) && matchedLocation.districts.length > 0) {
        // 如果没有精确匹配，随机选择一个区域（旧版本兼容）
        const districts = matchedLocation.districts;
        if (typeof districts[0] === 'string') {
          districtName = districts[Math.floor(Math.random() * districts.length)] as string;
        } else {
          const randomDistrict = districts[Math.floor(Math.random() * districts.length)] as { name: string };
          districtName = randomDistrict.name;
        }
      } else {
        districtName = '市区';
      }

      locationName = `${matchedLocation.name}${districtName}`;
      fullAddress = `${matchedLocation.name}市${districtName}附近`;
      details = {
        city: matchedLocation.name,
        suburb: districtName,
        state: matchedLocation.name,
        country: '中国'
      };

      console.log(`匹配到城市: ${matchedLocation.name}, 区域: ${districtName}`);
    } else {
      // 根据坐标范围推测大概区域
      let regionName = '未知区域';

      if (lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135) {
        // 在中国境内
        if (lat >= 45) regionName = '东北地区';
        else if (lat >= 35) regionName = '华北地区';
        else if (lat >= 30) regionName = '华东地区';
        else if (lat >= 25) regionName = '华南地区';
        else regionName = '南方地区';
      } else {
        regionName = `${lat.toFixed(1)}°N, ${lng.toFixed(1)}°E 附近`;
      }

      locationName = regionName;
      fullAddress = `${regionName} (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      details = {
        country: lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135 ? '中国' : undefined
      };
    }

    const locationInfo = {
      name: locationName,
      latitude: lat,
      longitude: lng,
      address: fullAddress,
      details: details
    };

    console.log('智能离线位置信息:', locationInfo);
    return locationInfo;
  };





  // 清除位置
  const clearLocation = () => {
    onLocationChange(null);
    setLocationError(null);
  };

  return (
    <div className="space-y-3">


      <label
        className="block text-sm font-medium"
        style={{ color: theme.colors.text }}
      >
        📍 位置 <span className="text-xs opacity-60">(可选)</span>
      </label>

      {/* 当前位置显示 */}
      {location && (
        <div className="space-y-3">
          <div
            className="flex items-center justify-between p-3 rounded-lg border"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border
            }}
          >
            <div className="flex items-center gap-2 flex-1">
              <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: theme.colors.primary }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: theme.colors.text }}>
                  {location.name || '未知位置'}
                </div>
                {location.address && location.address !== location.name && (
                  <div className="text-xs opacity-70 truncate" style={{ color: theme.colors.textSecondary }}>
                    {location.address}
                  </div>
                )}
                {location.latitude && location.longitude && (
                  <div className="text-xs opacity-50" style={{ color: theme.colors.textSecondary }}>
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={getCurrentLocation}
                className="p-1 rounded-full hover:bg-blue-100 transition-colors flex-shrink-0"
                title="刷新位置"
                disabled={disabled || isGettingLocation}
              >
                <Navigation className={`w-4 h-4 text-blue-500 ${isGettingLocation ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={clearLocation}
                className="p-1 rounded-full hover:bg-red-100 transition-colors flex-shrink-0"
                title="清除位置"
                disabled={disabled}
              >
                <X className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>



          {/* 高精度定位信息 */}
          {(location as any)?.highAccuracy && (
            <div
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.primary,
                borderStyle: 'dashed'
              }}
            >
              <div className="text-xs font-medium mb-2" style={{ color: theme.colors.primary }}>
                🎯 高精度定位信息
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="opacity-60" style={{ color: theme.colors.textSecondary }}>精度: </span>
                  <span style={{ color: theme.colors.text }}>
                    {(location as any).highAccuracy.accuracy?.toFixed(1)}米
                  </span>
                </div>
                <div>
                  <span className="opacity-60" style={{ color: theme.colors.textSecondary }}>置信度: </span>
                  <span style={{
                    color: (location as any).highAccuracy.confidence === 'high' ? '#28a745' :
                           (location as any).highAccuracy.confidence === 'medium' ? '#ffc107' : '#dc3545'
                  }}>
                    {(location as any).highAccuracy.confidence === 'high' ? '高' :
                     (location as any).highAccuracy.confidence === 'medium' ? '中' : '低'}
                  </span>
                </div>
                <div>
                  <span className="opacity-60" style={{ color: theme.colors.textSecondary }}>定位次数: </span>
                  <span style={{ color: theme.colors.text }}>
                    {(location as any).highAccuracy.attempts}次
                  </span>
                </div>
                <div>
                  <span className="opacity-60" style={{ color: theme.colors.textSecondary }}>坐标偏移: </span>
                  <span style={{ color: theme.colors.text }}>
                    {(location as any).highAccuracy.coordinateOffset?.distance?.toFixed(1)}米
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 详细地址信息 */}
          {location.details && (
            <div
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border
              }}
            >
              <div className="text-xs font-medium mb-2" style={{ color: theme.colors.text }}>
                🏢 详细信息
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {location.details.building && (
                  <div>
                    <span className="opacity-60" style={{ color: theme.colors.textSecondary }}>建筑: </span>
                    <span style={{ color: theme.colors.text }}>{location.details.building}</span>
                  </div>
                )}
                {location.details.road && (
                  <div>
                    <span className="opacity-60" style={{ color: theme.colors.textSecondary }}>道路: </span>
                    <span style={{ color: theme.colors.text }}>{location.details.road}</span>
                  </div>
                )}
                {location.details.neighbourhood && (
                  <div>
                    <span className="opacity-60" style={{ color: theme.colors.textSecondary }}>社区: </span>
                    <span style={{ color: theme.colors.text }}>{location.details.neighbourhood}</span>
                  </div>
                )}
                {location.details.city && (
                  <div>
                    <span className="opacity-60" style={{ color: theme.colors.textSecondary }}>城市: </span>
                    <span style={{ color: theme.colors.text }}>{location.details.city}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 位置状态显示 */}
      {locationError && (
        <div
          className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${
            locationError.includes('✅')
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-orange-200 bg-orange-50 text-orange-700'
          }`}
        >
          <span className="flex-shrink-0">
            {locationError.includes('✅') ? '✅' : '⚠️'}
          </span>
          <span className="flex-1">
            {locationError.replace('✅ ', '')}
          </span>
        </div>
      )}

      {/* 操作按钮 */}
      {!location && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={isGettingLocation || disabled}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:opacity-80 disabled:opacity-50"
            style={{
              backgroundColor: theme.colors.primary,
              color: 'white'
            }}
          >
            {isGettingLocation ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            {isGettingLocation ? '获取中...' : '快速定位'}
          </button>

          <button
            type="button"
            onClick={getHighAccuracyLocationInfo}
            disabled={isGettingLocation || disabled}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium border transition-all duration-200 hover:opacity-80 disabled:opacity-50"
            style={{
              borderColor: theme.colors.primary,
              color: theme.colors.primary,
              backgroundColor: theme.colors.surface
            }}
            title="多次定位取平均值，提高精度"
          >
            {isGettingLocation ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Target className="w-4 h-4" />
            )}
            {isGettingLocation ? '高精度定位中...' : '高精度定位'}
          </button>

          <button
            type="button"
            onClick={() => setShowManualInput(!showManualInput)}
            disabled={disabled}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium border transition-all duration-200 hover:opacity-80"
            style={{
              borderColor: theme.colors.border,
              color: theme.colors.text,
              backgroundColor: theme.colors.surface
            }}
          >
            <MapPin className="w-4 h-4" />
            手动输入
          </button>

          <button
            type="button"
            onClick={() => setShowMapPicker(true)}
            disabled={disabled}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium border transition-all duration-200 hover:opacity-80"
            style={{
              borderColor: theme.colors.primary,
              color: theme.colors.primary,
              backgroundColor: theme.colors.surface,
              position: 'relative',
              zIndex: 10
            }}
          >
            <Map className="w-4 h-4" />
            地图选择
          </button>


        </div>
      )}

      {/* 手动输入框 */}
      {showManualInput && (
        <div className="flex gap-2">
          <input
            type="text"
            value={manualLocation}
            onChange={(e) => setManualLocation(e.target.value)}
            placeholder="输入位置名称，如：咖啡厅、家里、公司..."
            className="flex-1 px-3 py-2 rounded-md border focus:outline-none focus:ring-2 transition-all duration-200"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text,
              '--tw-ring-color': theme.colors.primary,
            } as React.CSSProperties}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleManualLocation();
              }
            }}
            disabled={disabled}
          />
          <button
            type="button"
            onClick={handleManualLocation}
            disabled={!manualLocation.trim() || disabled}
            className="px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:opacity-80 disabled:opacity-50"
            style={{
              backgroundColor: theme.colors.primary,
              color: 'white'
            }}
          >
            添加
          </button>
        </div>
      )}

      {/* 地图位置选择器 - 只在需要时渲染 */}
      {showMapPicker && (
        <MapLocationPicker
          isOpen={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          onLocationSelect={(selectedLocation) => {
            onLocationChange(selectedLocation);
            setShowMapPicker(false);
          }}
          initialLocation={location ? { lat: location.latitude!, lng: location.longitude! } : null}
        />
      )}


    </div>
  );
}
