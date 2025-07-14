import { useEffect, useRef, useState } from 'react';
import { X, MapPin, Search, Navigation, Loader } from 'lucide-react';
import { LocationInfo } from '../types';
import { useThemeContext } from './ThemeProvider';
import { LOCATION_CONFIG, isAmapConfigured, isAmapJSConfigured } from '../config/location';
import { wgs84ToGcj02 } from '../utils/coordinateUtils';

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
  const userMarkerRef = useRef<any>(null);
  const placeSearchRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationInfo | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([121.4554, 31.0384]); // 默认交大位置
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLocating, setIsLocating] = useState(false);

  console.log('🗺️ MapLocationPicker 渲染:', { isOpen });

  // 键盘快捷键支持（已禁用，因为可能导致地图问题）
  // useEffect(() => {
  //   if (!isOpen || !isMapLoaded) return;

  //   const handleKeyPress = (e: KeyboardEvent) => {
  //     // 按 L 键快速定位
  //     if (e.key.toLowerCase() === 'l' && !e.ctrlKey && !e.altKey && !e.metaKey) {
  //       // 确保不是在输入框中
  //       const target = e.target as HTMLElement;
  //       if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
  //         e.preventDefault();
  //         // 增加安全检查
  //         if (mapRef.current && isMapLoaded) {
  //           locateUser();
  //         }
  //       }
  //     }
  //   };

  //   document.addEventListener('keydown', handleKeyPress);
  //   return () => document.removeEventListener('keydown', handleKeyPress);
  // }, [isOpen, isMapLoaded]);

  // 监听用户位置和地图加载状态，确保用户位置标记正确显示
  useEffect(() => {
    if (isMapLoaded && userLocation && mapRef.current) {
      console.log('🗺️ 添加用户位置标记:', userLocation);
      addUserLocationMarker(userLocation[0], userLocation[1]);
    }
  }, [isMapLoaded, userLocation]);

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
      setIsLoadingMap(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;

          // 🔧 坐标系转换：GPS(WGS84) -> 高德地图(GCJ02)
          const gcj02Result = wgs84ToGcj02(latitude, longitude);
          const convertedLat = gcj02Result.latitude;
          const convertedLng = gcj02Result.longitude;

          const newLocation: [number, number] = [convertedLng, convertedLat];
          setMapCenter(newLocation);
          setUserLocation(newLocation);

          // 输出调试信息
          console.log('🗺️ GPS定位成功 (坐标已转换):');
          console.log('  原始GPS坐标 (WGS84):', { latitude, longitude });
          console.log('  转换后坐标 (GCJ02):', { latitude: convertedLat, longitude: convertedLng });
          console.log('  坐标偏移距离:', `${gcj02Result.offset?.distance.toFixed(1)}米`);
          console.log('  GPS精度:', accuracy ? `${accuracy.toFixed(1)}米` : '未知');

          setIsLoadingMap(false);

          // 如果地图已经加载，立即添加用户位置标记
          if (mapRef.current && isMapLoaded) {
            addUserLocationMarker(convertedLng, convertedLat);
          }
        },
        (error) => {
          console.log('🗺️ 无法获取用户位置，使用默认位置:', error.message);
          setIsLoadingMap(false);
          // 保持默认位置
        },
        {
          timeout: 10000, // 增加超时时间到10秒
          enableHighAccuracy: true, // 启用高精度定位
          maximumAge: 0 // 不使用缓存，每次都获取最新位置
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

      // 创建script标签加载高德地图API，添加更多插件
      const script = document.createElement('script');
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${jsKey}&plugin=AMap.PlaceSearch,AMap.Geocoder,AMap.AutoComplete`;
      script.async = true;
      script.onload = initMap;
      script.onerror = () => {
        console.error('高德地图API加载失败');
        setIsLoadingMap(false);
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
          mapStyle: theme.mode === 'dark' ? 'amap://styles/dark' : 'amap://styles/normal',
          resizeEnable: true,
          rotateEnable: false,
          pitchEnable: false,
          zoomEnable: true,
          dragEnable: true
        });

        mapRef.current = map;

        // 等待地图完全加载
        map.on('complete', () => {
          console.log('🗺️ 地图加载完成');
          setIsMapLoaded(true);
          setIsLoadingMap(false);

          // 如果有初始位置，添加选择标记
          if (initialLocation) {
            addMarker(initialLocation.lng, initialLocation.lat);
          }
        });

        // 添加点击事件
        map.on('click', handleMapClick);

        // 初始化地点搜索服务
        const placeSearch = new window.AMap.PlaceSearch({
          pageSize: 10,
          pageIndex: 1,
          city: '全国',
          map: map,
          panel: false
        });
        placeSearchRef.current = placeSearch;

        // 添加定位控件（可选，提供额外的定位功能）
        try {
          const geolocation = new window.AMap.Geolocation({
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
            convert: true,
            showButton: false, // 不显示按钮，我们有自己的按钮
            showMarker: false, // 不显示默认标记，我们有自己的标记
            showCircle: false, // 不显示精度圆圈
            panToLocation: false, // 不自动平移到定位位置
            zoomToAccuracy: false // 不自动调整缩放级别
          });

          map.addControl(geolocation);
        } catch (error) {
          console.log('🗺️ 定位控件初始化失败:', error);
        }

      } catch (error) {
        console.error('地图初始化失败:', error);
        setIsLoadingMap(false);
      }
    };

    if (window.AMap) {
      initMap();
    } else {
      setIsLoadingMap(true);
      loadAMapAPI();
    }

    return () => {
      console.log('🗺️ 清理地图资源');
      if (mapRef.current) {
        // 清理所有标记
        if (markerRef.current) {
          mapRef.current.remove(markerRef.current);
          markerRef.current = null;
        }
        if (userMarkerRef.current) {
          mapRef.current.remove(userMarkerRef.current);
          userMarkerRef.current = null;
        }

        mapRef.current.destroy();
        mapRef.current = null;
      }
      if (placeSearchRef.current) {
        placeSearchRef.current = null;
      }
    };
  }, [isOpen, mapCenter, userLocation, theme.mode]);

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

  // 添加用户位置标记（蓝色圆点）
  const addUserLocationMarker = (lng: number, lat: number) => {
    if (!mapRef.current) return;

    console.log('🗺️ 正在添加用户位置标记:', { lng, lat });

    // 移除旧的用户位置标记
    if (userMarkerRef.current) {
      mapRef.current.remove(userMarkerRef.current);
      userMarkerRef.current = null;
    }

    // 方法0：最简单的默认标记测试
    try {
      const simpleMarker = new window.AMap.Marker({
        position: [lng, lat],
        title: '您的位置（简单标记）'
      });

      mapRef.current.add(simpleMarker);
      userMarkerRef.current = simpleMarker;

      console.log('🗺️ 简单用户位置标记添加成功');
      return; // 如果成功就直接返回
    } catch (simpleError) {
      console.error('🗺️ 简单标记失败:', simpleError);
    }

    try {
      // 创建Canvas绘制的蓝色圆点图标（更大更清晰）
      const canvas = document.createElement('canvas');
      const size = 24; // 增大尺寸
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        const center = size / 2;

        // 清除画布
        ctx.clearRect(0, 0, size, size);

        // 绘制阴影效果
        ctx.beginPath();
        ctx.arc(center + 1, center + 1, 10, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();

        // 绘制外圈（白色边框）
        ctx.beginPath();
        ctx.arc(center, center, 10, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = '#1890ff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 绘制内圈（蓝色圆点）
        ctx.beginPath();
        ctx.arc(center, center, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#1890ff';
        ctx.fill();

        // 添加小的白色中心点
        ctx.beginPath();
        ctx.arc(center, center, 2, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();
      }

      const userMarker = new window.AMap.Marker({
        position: [lng, lat],
        icon: new window.AMap.Icon({
          size: new window.AMap.Size(size, size),
          image: canvas.toDataURL(),
          imageOffset: new window.AMap.Pixel(0, 0) // 不使用偏移，让标记完全显示
        }),
        title: '您的位置',
        zIndex: 150,
        offset: new window.AMap.Pixel(-size/2, -size/2) // 使用offset而不是imageOffset
      });

      mapRef.current.add(userMarker);
      userMarkerRef.current = userMarker;

      console.log('🗺️ 用户位置标记添加成功');
    } catch (error) {
      console.error('🗺️ 添加用户位置标记失败:', error);

      // 备用方案1：使用高德地图内置图标
      try {
        const userMarker = new window.AMap.Marker({
          position: [lng, lat],
          icon: new window.AMap.Icon({
            size: new window.AMap.Size(32, 32),
            image: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="14" fill="white" stroke="#1890ff" stroke-width="3"/>
                <circle cx="16" cy="16" r="8" fill="#1890ff"/>
                <circle cx="16" cy="16" r="3" fill="white"/>
              </svg>
            `),
            imageOffset: new window.AMap.Pixel(0, 0)
          }),
          title: '您的位置',
          zIndex: 150,
          offset: new window.AMap.Pixel(-16, -16)
        });

        mapRef.current.add(userMarker);
        userMarkerRef.current = userMarker;
        console.log('🗺️ 使用SVG标记成功');
      } catch (svgError) {
        console.error('🗺️ SVG标记失败:', svgError);

        // 备用方案2：使用圆形标记
        try {
          const circle = new window.AMap.Circle({
            center: [lng, lat],
            radius: 8, // 减小半径避免遮挡
            strokeColor: 'white',
            strokeWeight: 4,
            fillColor: '#1890ff',
            fillOpacity: 1.0,
            zIndex: 150
          });

          mapRef.current.add(circle);
          userMarkerRef.current = circle;
          console.log('🗺️ 使用备用圆形标记成功');
        } catch (circleError) {
          console.error('🗺️ 所有标记方案都失败:', circleError);
        }
      }
    }
  };

  // 添加选择位置标记（红色标记）
  const addMarker = (lng: number, lat: number) => {
    if (!mapRef.current) return;

    console.log('🗺️ 正在添加选择位置标记:', { lng, lat });

    // 移除旧标记
    if (markerRef.current) {
      mapRef.current.remove(markerRef.current);
      markerRef.current = null;
    }

    // 方法0：使用红色的简单标记
    try {
      // 创建红色圆点标记
      const canvas = document.createElement('canvas');
      const size = 20;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const center = size / 2;

      if (ctx) {
        // 绘制红色圆点
        ctx.beginPath();
        ctx.arc(center, center, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff4d4f';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 绘制白色中心点
        ctx.beginPath();
        ctx.arc(center, center, 3, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();
      }

      const redMarker = new window.AMap.Marker({
        position: [lng, lat],
        icon: new window.AMap.Icon({
          size: new window.AMap.Size(size, size),
          image: canvas.toDataURL(),
          imageOffset: new window.AMap.Pixel(0, 0)
        }),
        title: '选择的位置',
        zIndex: 200,
        offset: new window.AMap.Pixel(-center, -center)
      });

      mapRef.current.add(redMarker);
      markerRef.current = redMarker;

      console.log('🗺️ 红色选择位置标记添加成功');
      return; // 如果成功就直接返回
    } catch (simpleError) {
      console.error('🗺️ 红色标记失败:', simpleError);
    }

    try {
      // 创建自定义的红色标记图标
      const canvas = document.createElement('canvas');
      const width = 30;
      const height = 40;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // 清除画布
        ctx.clearRect(0, 0, width, height);

        // 绘制阴影
        ctx.beginPath();
        ctx.arc(16, 16, 12, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();

        // 绘制标记主体（水滴形状）
        ctx.beginPath();
        ctx.arc(15, 15, 12, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff4d4f';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 绘制中心白点
        ctx.beginPath();
        ctx.arc(15, 15, 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();

        // 绘制指向下方的小三角
        ctx.beginPath();
        ctx.moveTo(15, 27);
        ctx.lineTo(10, 35);
        ctx.lineTo(20, 35);
        ctx.closePath();
        ctx.fillStyle = '#ff4d4f';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const marker = new window.AMap.Marker({
        position: [lng, lat],
        icon: new window.AMap.Icon({
          size: new window.AMap.Size(width, height),
          image: canvas.toDataURL(),
          imageOffset: new window.AMap.Pixel(0, 0) // 不使用imageOffset
        }),
        title: '选择的位置',
        zIndex: 200,
        offset: new window.AMap.Pixel(-15, -35) // 使用offset调整位置
      });

      mapRef.current.add(marker);
      markerRef.current = marker;

      console.log('🗺️ 选择位置标记添加成功');
    } catch (error) {
      console.error('🗺️ 添加选择位置标记失败:', error);

      // 备用方案：使用高德地图默认标记
      try {
        const marker = new window.AMap.Marker({
          position: [lng, lat],
          icon: new window.AMap.Icon({
            size: new window.AMap.Size(25, 34),
            image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
            imageOffset: new window.AMap.Pixel(0, 0)
          }),
          title: '选择的位置',
          zIndex: 200,
          offset: new window.AMap.Pixel(-12, -34)
        });

        mapRef.current.add(marker);
        markerRef.current = marker;
        console.log('🗺️ 使用默认红色标记成功');
      } catch (defaultError) {
        console.error('🗺️ 默认标记也失败:', defaultError);
      }
    }
  };

  // 搜索地址
  const handleSearch = () => {
    if (!searchQuery.trim() || !placeSearchRef.current) return;

    setIsSearching(true);
    setSearchResults([]);

    placeSearchRef.current.search(searchQuery, (status: string, result: any) => {
      setIsSearching(false);

      if (status === 'complete' && result.poiList && result.poiList.pois) {
        const pois = result.poiList.pois.slice(0, 5); // 只显示前5个结果
        setSearchResults(pois);
        console.log('🔍 搜索结果:', pois);
      } else {
        console.log('🔍 搜索失败或无结果:', status, result);
        setSearchResults([]);
      }
    });
  };

  // 选择搜索结果
  const selectSearchResult = (poi: any) => {
    const lng = poi.location.lng;
    const lat = poi.location.lat;

    // 移动地图到该位置
    mapRef.current.setCenter([lng, lat]);
    mapRef.current.setZoom(17);

    // 添加标记
    addMarker(lng, lat);

    // 创建位置信息
    const locationInfo: LocationInfo = {
      name: poi.name,
      latitude: lat,
      longitude: lng,
      address: poi.address || poi.name,
      details: {
        building: poi.name,
        city: poi.cityname,
        suburb: poi.adname,
        country: '中国'
      }
    };

    setSelectedLocation(locationInfo);
    setSearchResults([]);
    setSearchQuery('');
  };

  // 定位到用户位置（增强版）
  const locateUser = () => {
    // 增强安全检查
    if (!mapRef.current || !isMapLoaded) {
      console.warn('🗺️ 地图未完全加载，无法定位');
      return;
    }

    if (isLocating) {
      console.warn('🗺️ 正在定位中，请稍候');
      return;
    }

    // 如果已有用户位置，直接定位
    if (userLocation) {
      try {
        mapRef.current.setCenter(userLocation);
        mapRef.current.setZoom(17);

        // 添加一个临时的脉冲效果来突出显示用户位置
        if (userMarkerRef.current) {
          // 创建一个临时的脉冲圆圈
          const pulseCircle = new window.AMap.Circle({
            center: userLocation,
            radius: 50,
            strokeColor: '#1890ff',
            strokeWeight: 2,
            fillColor: '#1890ff',
            fillOpacity: 0.2
          });

          mapRef.current.add(pulseCircle);

          // 2秒后移除脉冲效果
          setTimeout(() => {
            if (mapRef.current) {
              try {
                mapRef.current.remove(pulseCircle);
              } catch (error) {
                console.warn('🗺️ 移除脉冲效果失败:', error);
              }
            }
          }, 2000);
        }

        console.log('🗺️ 成功定位到已知用户位置');
        return;
      } catch (error) {
        console.error('🗺️ 定位到用户位置失败:', error);
        // 继续执行重新获取位置的逻辑
      }
    }

    // 如果没有用户位置，重新获取
    getCurrentLocationAndUpdate();
  };

  // 获取当前位置并更新地图（高精度版本）
  const getCurrentLocationAndUpdate = () => {
    if (!navigator.geolocation) {
      alert('您的浏览器不支持地理定位功能');
      return;
    }

    if (!mapRef.current || !isMapLoaded) {
      console.error('🗺️ 地图未准备好，无法定位');
      alert('地图还在加载中，请稍候再试');
      return;
    }

    if (isLocating) {
      console.warn('🗺️ 已在定位中');
      return;
    }

    setIsLocating(true);

    // 尝试多次定位以提高精度
    let bestPosition: GeolocationPosition | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    const tryGetPosition = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          console.log(`🗺️ 定位尝试 ${attempts + 1}/${maxAttempts}:`, {
            latitude,
            longitude,
            accuracy: accuracy ? `${accuracy.toFixed(1)}米` : '未知'
          });

          // 如果这是第一次定位，或者精度更好，就使用这个位置
          if (!bestPosition || (accuracy && accuracy < (bestPosition.coords.accuracy || Infinity))) {
            bestPosition = position;
          }

          attempts++;

          // 如果达到最大尝试次数，或者精度已经很好了，就使用最佳位置
          if (attempts >= maxAttempts || (accuracy && accuracy <= 20)) {
            const finalPosition = bestPosition!;
            const { latitude: finalLat, longitude: finalLng, accuracy: finalAccuracy } = finalPosition.coords;

            // 🔧 坐标系转换：GPS(WGS84) -> 高德地图(GCJ02)
            const gcj02Result = wgs84ToGcj02(finalLat, finalLng);
            const convertedLat = gcj02Result.latitude;
            const convertedLng = gcj02Result.longitude;

            const newLocation: [number, number] = [convertedLng, convertedLat];

            // 更新用户位置
            setUserLocation(newLocation);

            // 输出最终定位结果
            console.log('🎯 最终定位结果 (坐标已转换):');
            console.log('  原始GPS坐标 (WGS84):', { latitude: finalLat, longitude: finalLng });
            console.log('  转换后坐标 (GCJ02):', { latitude: convertedLat, longitude: convertedLng });
            console.log('  坐标偏移距离:', `${gcj02Result.offset?.distance.toFixed(1)}米`);
            console.log('  GPS精度:', finalAccuracy ? `${finalAccuracy.toFixed(1)}米` : '未知');

            // 移动地图到新位置
            if (mapRef.current) {
              mapRef.current.setCenter(newLocation);
              mapRef.current.setZoom(18); // 提高缩放级别以显示更多细节

              // 添加或更新用户位置标记
              addUserLocationMarker(convertedLng, convertedLat);

              // 添加精度圆圈
              const accuracyRadius = finalPosition.coords.accuracy || 50;
              const accuracyCircle = new window.AMap.Circle({
                center: newLocation,
                radius: accuracyRadius,
                strokeColor: '#1890ff',
                strokeWeight: 1,
                fillColor: '#1890ff',
                fillOpacity: 0.1
              });

              mapRef.current.add(accuracyCircle);

              // 添加脉冲效果
              const pulseCircle = new window.AMap.Circle({
                center: newLocation,
                radius: 30,
                strokeColor: '#1890ff',
                strokeWeight: 2,
                fillColor: '#1890ff',
                fillOpacity: 0.3
              });

              mapRef.current.add(pulseCircle);

              // 移除效果
              setTimeout(() => {
                if (mapRef.current) {
                  mapRef.current.remove(pulseCircle);
                  // 精度圆圈保留5秒后移除
                  setTimeout(() => {
                    if (mapRef.current) {
                      mapRef.current.remove(accuracyCircle);
                    }
                  }, 5000);
                }
              }, 2000);
            }

            setIsLocating(false);
            console.log('🗺️ 最终定位结果:', {
              longitude: finalLng,
              latitude: finalLat,
              accuracy: finalPosition.coords.accuracy ? `${finalPosition.coords.accuracy.toFixed(1)}米` : '未知',
              attempts: attempts
            });
          } else {
            // 继续尝试获取更精确的位置
            setTimeout(tryGetPosition, 1000);
          }
        },
        (error) => {
          console.error(`🗺️ 定位尝试 ${attempts + 1} 失败:`, error);

          attempts++;

          if (attempts >= maxAttempts) {
            setIsLocating(false);

            let errorMessage = '定位失败';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = '定位权限被拒绝，请在浏览器设置中允许位置访问';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = '位置信息不可用，可能是网络问题或GPS信号弱';
                break;
              case error.TIMEOUT:
                errorMessage = '定位请求超时，请检查网络连接或移动到信号更好的地方';
                break;
            }

            alert(errorMessage + '\n\n提示：\n1. 确保允许浏览器访问位置\n2. 在户外或窗边信号更好\n3. 关闭省电模式可提高精度');
          } else {
            // 继续尝试
            setTimeout(tryGetPosition, 2000);
          }
        },
        {
          enableHighAccuracy: true, // 启用高精度定位
          timeout: 8000, // 单次尝试超时时间
          maximumAge: 0 // 不使用缓存位置，强制获取最新位置
        }
      );
    };

    // 开始第一次尝试
    tryGetPosition();
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
          <div className="flex items-center gap-2">
            {/* 定位按钮 - 始终显示 */}
            <button
              onClick={locateUser}
              disabled={isLocating}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-50"
              style={{
                backgroundColor: userLocation ? theme.colors.primary : `${theme.colors.primary}20`,
                color: userLocation ? 'white' : theme.colors.primary,
                border: `1px solid ${theme.colors.primary}`
              }}
              title={userLocation ? "定位到我的位置" : "获取我的位置"}
            >
              {isLocating ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Navigation className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {isLocating ? '定位中...' : userLocation ? '我的位置' : '获取位置'}
              </span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" style={{ color: theme.colors.text }} />
            </button>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="p-4 border-b" style={{ borderColor: theme.colors.border }}>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索地址、建筑物或地标..."
                className="w-full px-3 py-2 pr-10 rounded-md border text-sm"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }}
                disabled={!isMapLoaded}
              />
              <Search className="absolute right-3 top-2.5 w-4 h-4" style={{ color: theme.colors.textSecondary }} />
            </div>
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || isSearching || !isMapLoaded}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                backgroundColor: theme.colors.primary,
                color: 'white'
              }}
            >
              {isSearching ? <Loader className="w-4 h-4 animate-spin" /> : '搜索'}
            </button>

            {/* 调试按钮 - 仅在开发环境显示 */}
            {import.meta.env.DEV && (
              <div className="flex gap-1">
                {userLocation && (
                  <button
                    onClick={() => addUserLocationMarker(userLocation[0], userLocation[1])}
                    className="px-2 py-2 rounded-md text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: '#e6f7ff',
                      color: '#1890ff'
                    }}
                    title="重新添加用户位置标记（调试用）"
                  >
                    🔵
                  </button>
                )}
                <button
                  onClick={() => {
                    const center = mapRef.current?.getCenter();
                    if (center) {
                      addMarker(center.lng, center.lat);
                    }
                  }}
                  className="px-2 py-2 rounded-md text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: '#fff2f0',
                    color: '#ff4d4f'
                  }}
                  title="在地图中心添加选择标记（调试用）"
                >
                  🔴
                </button>
                <button
                  onClick={() => {
                    // 测试最简单的标记
                    if (mapRef.current) {
                      const center = mapRef.current.getCenter();
                      const testMarker = new window.AMap.Marker({
                        position: [center.lng, center.lat],
                        title: '测试标记 - 无偏移'
                      });
                      mapRef.current.add(testMarker);
                    }
                  }}
                  className="px-2 py-2 rounded-md text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: '#f6ffed',
                    color: '#52c41a'
                  }}
                  title="添加默认标记测试（调试用）"
                >
                  ✅
                </button>
              </div>
            )}
          </div>

          {/* 搜索结果 */}
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto">
              {searchResults.map((poi, index) => (
                <div
                  key={index}
                  onClick={() => selectSearchResult(poi)}
                  className="p-2 hover:bg-gray-50 cursor-pointer rounded text-sm border-b last:border-b-0"
                  style={{ borderColor: theme.colors.border }}
                >
                  <div className="font-medium" style={{ color: theme.colors.text }}>
                    {poi.name}
                  </div>
                  <div className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    {poi.address}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 地图容器 */}
        <div className="flex-1 relative">
          <div
            ref={mapContainerRef}
            className="w-full h-full"
            style={{ minHeight: '400px' }}
          />

          {/* 加载状态 */}
          {(isLoadingMap || !isMapLoaded) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
              <div className="text-center">
                <Loader className="w-8 h-8 animate-spin mx-auto mb-2" style={{ color: theme.colors.primary }} />
                <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
                  {isLoadingMap ? '正在获取位置...' : '正在加载地图...'}
                </div>
              </div>
            </div>
          )}

          {/* 浮动定位按钮 */}
          {isMapLoaded && (
            <button
              onClick={locateUser}
              disabled={isLocating}
              className="absolute top-4 right-4 p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110 disabled:opacity-50 z-20"
              style={{
                backgroundColor: userLocation ? theme.colors.primary : 'white',
                color: userLocation ? 'white' : theme.colors.primary,
                border: `2px solid ${theme.colors.primary}`
              }}
              title={userLocation ? "定位到我的位置" : "获取我的位置"}
            >
              {isLocating ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Navigation className="w-5 h-5" />
              )}
            </button>
          )}

          {/* 地图说明 */}
          {isMapLoaded && (
            <div className="absolute bottom-4 left-4 bg-white bg-opacity-95 rounded-lg px-3 py-2 text-xs shadow-lg" style={{ color: theme.colors.textSecondary }}>
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500 border border-white"></div>
                    <span>您的位置</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500 border border-white"></div>
                    <span>选择位置</span>
                  </div>
                </div>
                <div className="text-xs opacity-70 border-t pt-1">
                  💡 点击地图选择位置 | 使用定位按钮找到自己
                </div>
                {userLocation && (
                  <div className="text-xs opacity-60">
                    🎯 高精度定位已启用
                  </div>
                )}
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
