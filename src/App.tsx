/*
 * @Author: xt 1661219752@qq.com
 * @Date: 2024-08-23 11:10:40
 * @LastEditors: xt 1661219752@qq.com
 * @LastEditTime: 2024-08-30 17:06:40
 * @Description:
 */
import { useEffect, useState } from 'react'
import './App.css'
import mapBoxStyle from './assets/mapBoxStyle.json'
import { GetFeaturesBySQLParameters, FeatureService } from '@supermapgis/iclient-ol'
import { applyStyle } from 'ol-mapbox-style'
import Map from 'ol/Map.js'
import View from 'ol/View.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import { fromLonLat } from 'ol/proj.js'
import VectorTileLayer from 'ol/layer/VectorTile.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import { defaults as defaultInteractions } from 'ol/interaction/defaults'
import { defaults as defaultControls } from 'ol/control/defaults'
import Overlay from 'ol/Overlay.js'
import Modify from 'ol/interaction/Modify'
import Select from 'ol/interaction/Select'
import Draw from 'ol/interaction/Draw'
import Snap from 'ol/interaction/Snap'
import { Layer } from 'ol/layer'
import { Button } from 'antd'


const apiServices = new FeatureService('https://iserver.supermap.io/iserver/services/data-China100/rest/data')
function App() {
	const [map, setMap] = useState<Map | null>(null)
	const [areaLayer, setAreaLayer] = useState<Layer | null>(null)
	const [smid, setSmid] = useState<string>('15')
	console.log('App组件渲染')

	// 加载地图
	useEffect(() => {
		const client = new Map({
			target: 'map',
			controls: defaultControls(),
			interactions: defaultInteractions({ doubleClickZoom: false }),
			view: new View({
				center: fromLonLat([116.0678288, 35.9384171]),
				zoom: 5,
				minZoom: 1,
				maxZoom: 10,
				smoothExtentConstraint: false,
				extent: [-20037508.342789249, -20037508.34278914, 20037508.342789245, 20037508.342789089],
				projection: 'EPSG:3857',
			}),
		})
		const layer = new VectorTileLayer({ declutter: true })
		applyStyle(layer, mapBoxStyle)
		client.addLayer(layer)
		setMap(client)
		console.log('地图加载完成')
		return () => {
			client && client.setTarget(undefined)
			setMap(null)
		}
	}, [])

	// 初始化地图数据
	useEffect(() => {
		console.log('初始化地图数据', map)
		if (map) combineAction(map)
	}, [map])

	// 切换省份
	const combineAction = async (map: Map, smid: string = '15') => {
		const layer = await setMapLayer(map, smid)
		setMapInteraction(map, layer)
		setSmid(smid)
		setAreaLayer(layer)
	}

	const setMapLayer = async (map: Map, smid: string) => {
		var sqlParam = new GetFeaturesBySQLParameters({
			queryParameter: {
				name: 'China_Province_pg@China',
				attributeFilter: `SMID = ${smid}`,
			},
			datasetNames: ['China:China_Province_pg'],
			returnFeaturesOnly: true,
		})
		const result = await apiServices.getFeaturesBySQL(sqlParam)
		if (areaLayer !== null) map.removeLayer(areaLayer) // 先清除之前的图层
		const vectorSource = new VectorSource({
			features: new GeoJSON().readFeatures(result.result.features),
			wrapX: false,
		})
		const vectorLayer = new VectorLayer({
			source: vectorSource,
		})
		map.addLayer(vectorLayer)
		return vectorLayer
	}

	const setMapInteraction = (map: Map, layer: VectorLayer) => {
		// Select 增加图层可选中功能
		const selecter = new Select({ layers: [layer] })
		selecter.on('select', e => {
			console.log(e)
		})
		map.addInteraction(selecter)
		// 增加在地图上绘制功能，数据会添加到指定数据源
		map.addInteraction(
			new Draw({
				type: 'Polygon',
				source: layer.getSource()!,
			})
		)
		map.addInteraction(
			new Snap({
				source: layer.getSource()!,
			})
		)
		// Modify增加修改功能
		map.addInteraction(new Modify({ features: selecter.getFeatures() }))
	}

  const setMapOverlay = (map: Map) => {
      //  const overlay = new Overlay({
			// 		element: this.$refs.hotspotMarkRef,
			// 		stopEvent: true,
			// 		position: fromLonLat([longitude, latitude]),
			// 	})
			// 	this.map.addOverlay(this.overlay)
  }

	return (
		<>
			<div id='map'></div>
      <div className='province-select-container'>
        <Button type='primary' >河北省</Button>
      </div>
		</>
	)
}

export default App
