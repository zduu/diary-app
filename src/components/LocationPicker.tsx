import React, { useState } from 'react';
import { MapPin, Loader, X, Navigation } from 'lucide-react';
import { LocationInfo } from '../types';
import { useThemeContext } from './ThemeProvider';

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

      const { latitude, longitude } = position.coords;
      
      // 获取详细的位置信息
      try {
        const locationInfo = await getDetailedLocationInfo(latitude, longitude);
        onLocationChange(locationInfo);
      } catch (geocodeError) {
        console.error('地理编码失败，使用坐标作为位置名称:', geocodeError);

        // 提供离线模式的基本位置信息
        const offlineLocationInfo = createSmartOfflineLocation(latitude, longitude);
        onLocationChange(offlineLocationInfo);

        // 显示友好的成功信息
        setLocationError('✅ 已智能识别位置信息！由于网络限制，使用了离线模式。');
        setTimeout(() => setLocationError(null), 4000);
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

  // 获取详细的位置信息，包括周围建筑
  const getDetailedLocationInfo = async (lat: number, lng: number) => {
    console.log('开始获取位置信息:', lat, lng);

    // 首先尝试使用浏览器的内置地理编码（如果可用）
    try {
      const browserLocationInfo = await tryBrowserGeocoding(lat, lng);
      if (browserLocationInfo) {
        console.log('使用浏览器地理编码成功:', browserLocationInfo);
        return browserLocationInfo;
      }
    } catch (error) {
      console.log('浏览器地理编码不可用:', error);
    }

    // 尝试使用代理服务或JSONP方式
    const geocodeServices = [
      // 使用JSONP方式避免CORS问题
      {
        name: 'Nominatim-JSONP',
        method: 'jsonp'
      },
      // 如果有代理服务可以添加在这里
    ];

    for (const service of geocodeServices) {
      try {
        if (service.method === 'jsonp') {
          console.log('尝试使用JSONP方式获取位置信息...');
          const locationInfo = await tryJSONPGeocoding(lat, lng);
          if (locationInfo) {
            console.log('JSONP地理编码成功:', locationInfo);
            return locationInfo;
          }
        }
      } catch (error) {
        console.error(`${service.name} 服务失败:`, error);
        continue;
      }
    }

    // 所有在线服务都失败，使用智能离线模式
    console.log('所有在线服务失败，使用智能离线模式');
    return createSmartOfflineLocation(lat, lng);
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
            {isGettingLocation ? '获取中...' : '获取当前位置'}
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

          {/* 测试按钮 - 仅在开发环境显示 */}
          {import.meta.env.DEV && (
            <button
              type="button"
              onClick={() => {
                // 模拟一个详细的位置信息用于测试
                const testLocation = {
                  name: "星巴克咖啡(南京西路店)",
                  latitude: 31.2304,
                  longitude: 121.4737,
                  address: "上海市静安区南京西路1376号上海商城",
                  nearbyPOIs: [
                    { name: "上海商城", type: "商场", distance: 50 },
                    { name: "静安寺", type: "景点", distance: 200 },
                    { name: "中信银行", type: "银行", distance: 120 },
                    { name: "麦当劳", type: "快餐店", distance: 80 },
                    { name: "地铁静安寺站", type: "地铁站", distance: 300 }
                  ],
                  details: {
                    building: "上海商城",
                    house_number: "1376",
                    road: "南京西路",
                    neighbourhood: "静安寺商圈",
                    suburb: "静安区",
                    city: "上海市",
                    state: "上海",
                    country: "中国"
                  }
                };
                onLocationChange(testLocation);
              }}
              disabled={disabled}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium border transition-all duration-200 hover:opacity-80"
              style={{
                borderColor: theme.colors.primary,
                color: theme.colors.primary,
                backgroundColor: theme.colors.surface
              }}
            >
              🧪 测试位置
            </button>
          )}
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
    </div>
  );
}
