import { useEffect, useRef, useState } from 'react';
import { X, MapPin } from 'lucide-react';
import { LocationInfo } from '../types';
import { useThemeContext } from './ThemeProvider';
import { LOCATION_CONFIG, isAmapConfigured, isAmapJSConfigured } from '../config/location';

interface MapLocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (location: LocationInfo) => void;
  initialLocation?: { lat: number; lng: number } | null;
}

declare global {
  interface Window {
    AMap: any;
    _AMapSecurityConfig: any;
  }
}

declare global {
  interface Window {
    AMap: any;
    _AMapSecurityConfig: any;
  }
}

export function MapLocationPicker({
  isOpen,
  onClose,
  onLocationSelect,
  initialLocation
}: MapLocationPickerProps) {
  const { theme } = useThemeContext();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationInfo | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([121.4554, 31.0384]); // 默认交大位置

  console.log('🗺️ MapLocationPicker 渲染:', { isOpen });

  // 获取用户当前位置作为地图中心
  useEffect(() => {
    if (!isOpen) return;

    // 如果有初始位置，使用初始位置
    if (initialLocation) {
      setMapCenter([initialLocation.lng, initialLocation.lat]);
      return;
    }

    // 尝试获取用户当前位置
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter([longitude, latitude]);
          console.log('🗺️ 获取到用户位置，设置为地图中心:', { longitude, latitude });
        },
        (error) => {
          console.log('🗺️ 无法获取用户位置，使用默认位置:', error.message);
          // 保持默认位置
        },
        {
          timeout: 5000,
          enableHighAccuracy: false
        }
      );
    }
  }, [isOpen, initialLocation]);

  // 加载高德地图API
  useEffect(() => {
    if (!isOpen || isMapLoaded) return;

    // 检查API配置
    if (!isAmapConfigured() || !isAmapJSConfigured()) {
      console.error('高德地图API密钥未配置或不完整');
      return;
    }

    const loadAMapAPI = () => {
      // 获取正确的密钥
      const jsKey = LOCATION_CONFIG.AMAP_JS_KEY;
      const securityCode = LOCATION_CONFIG.AMAP_SECURITY_CODE;

      console.log('加载高德地图API:', { jsKey, securityCode });

      // 设置安全密钥
      window._AMapSecurityConfig = {
        securityJsCode: securityCode,
      };

      // 创建script标签加载高德地图API
      const script = document.createElement('script');
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${jsKey}&plugin=AMap.PlaceSearch,AMap.Geocoder`;
      script.async = true;
      script.onload = initMap;
      script.onerror = () => {
        console.error('高德地图API加载失败');
      };
      document.head.appendChild(script);
    };

    const initMap = () => {
      if (!mapContainerRef.current || !window.AMap) return;

      try {
        // 创建地图实例
        const map = new window.AMap.Map(mapContainerRef.current, {
          zoom: 16,
          center: mapCenter,
          mapStyle: theme.mode === 'dark' ? 'amap://styles/dark' : 'amap://styles/normal'
        });

        mapRef.current = map;

        // 添加点击事件
        map.on('click', handleMapClick);

        // 如果有初始位置，添加标记
        if (initialLocation) {
          addMarker(initialLocation.lng, initialLocation.lat);
        }

        setIsMapLoaded(true);
      } catch (error) {
        console.error('地图初始化失败:', error);
      }
    };

    if (window.AMap) {
      initMap();
    } else {
      loadAMapAPI();
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [isOpen, mapCenter, theme.mode]);

  // 地图点击事件
  const handleMapClick = async (e: any) => {
    const { lng, lat } = e.lnglat;
    console.log('🗺️ 地图被点击，坐标:', { lng, lat });

    addMarker(lng, lat);

    // 逆地理编码获取地址信息
    try {
      const geocoder = new window.AMap.Geocoder({
        radius: 1000,
        extensions: 'all'
      });

      geocoder.getAddress([lng, lat], (status: string, result: any) => {
        console.log('🗺️ 地理编码结果:', { status, result });

        if (status === 'complete' && result.regeocode) {
          const regeocode = result.regeocode;
          const addressComponent = regeocode.addressComponent;
          const formattedAddress = regeocode.formattedAddress;

          const locationInfo: LocationInfo = {
            name: getLocationName(addressComponent, formattedAddress),
            latitude: lat,
            longitude: lng,
            address: formattedAddress,
            details: {
              building: addressComponent.building?.name,
              neighbourhood: addressComponent.neighborhood?.name,
              road: addressComponent.streetNumber?.street,
              house_number: addressComponent.streetNumber?.number,
              suburb: addressComponent.district,
              city: addressComponent.city,
              state: addressComponent.province,
              country: '中国'
            }
          };

          console.log('🗺️ 设置选中位置:', locationInfo);
          setSelectedLocation(locationInfo);
        } else {
          console.error('🗺️ 地理编码失败，使用坐标创建位置:', { status, result });

          // API失败时，创建基于坐标的位置信息
          const fallbackLocationInfo: LocationInfo = {
            name: `位置 ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            latitude: lat,
            longitude: lng,
            address: `经度: ${lng.toFixed(6)}, 纬度: ${lat.toFixed(6)}`,
            details: {
              city: '未知城市',
              country: '中国'
            }
          };

          console.log('🗺️ 设置备用位置信息:', fallbackLocationInfo);
          setSelectedLocation(fallbackLocationInfo);
        }
      });
    } catch (error) {
      console.error('逆地理编码失败:', error);
    }
  };

  // 添加地图标记
  const addMarker = (lng: number, lat: number) => {
    if (!mapRef.current) return;

    // 移除旧标记
    if (markerRef.current) {
      mapRef.current.remove(markerRef.current);
    }

    // 添加新标记
    const marker = new window.AMap.Marker({
      position: [lng, lat],
      icon: new window.AMap.Icon({
        size: new window.AMap.Size(25, 34),
        image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png'
      })
    });

    mapRef.current.add(marker);
    markerRef.current = marker;
  };

  // 智能选择位置名称
  const getLocationName = (addressComponent: any, formattedAddress: string) => {
    if (addressComponent.building?.name) return addressComponent.building.name;
    if (addressComponent.neighborhood?.name) return addressComponent.neighborhood.name;
    if (addressComponent.streetNumber?.street && addressComponent.streetNumber?.number) {
      return `${addressComponent.streetNumber.street}${addressComponent.streetNumber.number}号`;
    }
    if (addressComponent.streetNumber?.street) return addressComponent.streetNumber.street;
    if (addressComponent.township?.name) return addressComponent.township.name;
    if (addressComponent.district) return `${addressComponent.city || ''}${addressComponent.district}`;

    if (formattedAddress) {
      const parts = formattedAddress.split(/[省市区县]/);
      if (parts.length > 1) return parts[parts.length - 1].trim();
    }

    return '选中位置';
  };

  // 确认选择
  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      onClose();
    }
  };

  if (!isOpen) return null;

  // 检查API配置
  if (!isAmapConfigured() || !isAmapJSConfigured()) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
          style={{ backgroundColor: theme.colors.background }}
        >
          <div className="text-center">
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: theme.colors.text }}>
              地图功能需要配置
            </h3>
            <p className="text-sm mb-4" style={{ color: theme.colors.textSecondary }}>
              地图选择功能需要配置高德地图的JavaScript API密钥。
              <br />
              请查看配置指南：docs/amap-api-setup.md
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-md text-white font-medium"
                style={{ backgroundColor: theme.colors.primary }}
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col"
        style={{ backgroundColor: theme.colors.background }}
      >
        {/* 头部 */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: theme.colors.border }}
        >
          <h3 className="text-lg font-semibold" style={{ color: theme.colors.text }}>
            📍 选择位置
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: theme.colors.text }} />
          </button>
        </div>

        {/* 地图容器 */}
        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="w-full h-full" />
          {!isMapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <div style={{ color: theme.colors.text }}>加载地图中...</div>
              </div>
            </div>
          )}
        </div>

        {/* 选中位置信息 */}
        {selectedLocation && (
          <div className="p-4 border-t" style={{ borderColor: theme.colors.border }}>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4" style={{ color: theme.colors.primary }} />
              <span className="font-medium" style={{ color: theme.colors.text }}>
                {selectedLocation.name}
              </span>
            </div>
            <div className="text-sm opacity-70 mb-3" style={{ color: theme.colors.textSecondary }}>
              {selectedLocation.address}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  console.log('🗺️ 点击取消按钮');
                  onClose();
                }}
                className="px-4 py-2 border rounded-md"
                style={{
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }}
              >
                取消
              </button>
              <button
                onClick={() => {
                  console.log('🗺️ 点击确认选择按钮，位置:', selectedLocation);
                  handleConfirm();
                }}
                className="px-4 py-2 rounded-md text-white font-medium"
                style={{ backgroundColor: theme.colors.primary }}
              >
                确认选择
              </button>
            </div>
          </div>
        )}

        {/* 提示信息 */}
        <div className="p-2 text-center text-xs opacity-60" style={{ color: theme.colors.textSecondary }}>
          点击地图选择位置
        </div>
      </div>
    </div>
  );
}
