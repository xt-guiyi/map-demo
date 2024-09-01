/*
 * @Author: xt 1661219752@qq.com
 * @Date: 2024-08-23 11:10:40
 * @LastEditors: xt-guiyi 1661219752@qq.com
 * @LastEditTime: 2024-09-01 21:20:49
 * @Description: 地图页
 */
import { useEffect, useRef, useState } from 'react'
import './App.css'
import cityData from './assets/cityData.json'
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
import FullScreen from 'ol/control/FullScreen.js'
import Modify from 'ol/interaction/Modify'
import Select from 'ol/interaction/Select'
import Draw from 'ol/interaction/Draw'
import Snap from 'ol/interaction/Snap'
import Translate from 'ol/interaction/Translate'
import { format } from 'ol/coordinate.js'
import MousePosition from 'ol/control/MousePosition'
import { TreeSelect, FloatButton, Spin } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import Control from 'ol/control/Control'

const apiServices = new FeatureService('https://iserver.supermap.io/iserver/services/data-China100/rest/data')
const requestFuns = {
	getCityParams: (smid: string) => {
		return new GetFeaturesBySQLParameters({
			queryParameter: {
				name: 'China_Province_pg@China',
				attributeFilter: `SMID = ${smid}`,
			},
			datasetNames: ['China:China_Province_pg'],
			returnFeaturesOnly: true,
		})
	},
	getWorldParams: (smid: string) => {
		return new GetFeaturesBySQLParameters({
			queryParameter: {
				name: 'World_Continent_pg@China',
				attributeFilter: `SMID = ${smid}`,
			},
			datasetNames: ['China:World_Continent_pg'],
			returnFeaturesOnly: true,
		})
	},
}

function App() {
	const mapRef = useRef<Map>()
	// 数据图层
	const areaLayerRef = useRef<VectorLayer>()
	// 交互器
	const selectInteractionRef = useRef<Select>()
	const modifyInteractionRef = useRef<Modify>()
	const translateInteractionRef = useRef<Translate>()
	const snapInteractionRef = useRef<Snap>()
	const drawInteractionRef = useRef<Draw>()
	// dom节点
	const provinceSelectRef = useRef<HTMLDivElement>(null!)
	const editRef = useRef<HTMLDivElement>(null!)
	const [isEdit, setIsEdit] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	console.log('App组件渲染')

	// 加载地图
	useEffect(() => {
		const client = new Map({
			target: 'map',
			controls: [
				new FullScreen(),
				new MousePosition({
					coordinateFormat: coordinate => format(coordinate!, '经度：{x} | 纬度：{y}', 2),
					projection: 'EPSG:4326',
				}),
			],
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
		// 加载自定义控件
		client.addControl(new Control({ element: provinceSelectRef.current }))
		client.addControl(new Control({ element: editRef.current }))
		// 加载地图底图
		const layer = new VectorTileLayer({ declutter: true })
		applyStyle(layer, mapBoxStyle)
		// 加载数据
		client.addLayer(layer)
		mapRef.current = client
		handleAreaSelect()
		console.log('地图加载完成')
		return () => {
			mapRef.current && mapRef.current.setTarget(undefined)
		}
	}, [])

	// 处理省份切换
	const handleAreaSelect = async (smid?: string) => {
		if (!mapRef.current) return
		if (areaLayerRef.current) mapRef.current.removeLayer(areaLayerRef.current) // 先清除之前的图层
		setIsEdit(false)
		setIsLoading(true)
		const sqlParam = smid ? requestFuns.getCityParams(smid) : requestFuns.getWorldParams('1')
		const { result } = await apiServices.getFeaturesBySQL(sqlParam)
		const vectorSource = new VectorSource({
			features: new GeoJSON().readFeatures(result.features),
			wrapX: false,
		})
		const vectorLayer = new VectorLayer({
			source: vectorSource,
			updateWhileAnimating: true,
			updateWhileInteracting: true,
		})
		mapRef.current.addLayer(vectorLayer)
		mapRef.current.getView().fit(vectorSource.getExtent(), { padding: [50, 50, 50, 170] })
		areaLayerRef.current = vectorLayer
		setIsLoading(false)
		setInteraction(mapRef.current, areaLayerRef.current)
	}

	// 设置交互控件
	const setInteraction = (map: Map, layer: VectorLayer) => {
		if (selectInteractionRef.current) map.removeInteraction(selectInteractionRef.current)
		if (modifyInteractionRef.current) map.removeInteraction(modifyInteractionRef.current)
		if (translateInteractionRef.current) map.removeInteraction(translateInteractionRef.current)
		if (drawInteractionRef.current) map.removeInteraction(drawInteractionRef.current)
		if (snapInteractionRef.current) map.removeInteraction(snapInteractionRef.current)
		// 增加选中功能
		selectInteractionRef.current = new Select({ layers: [layer] })
		selectInteractionRef.current.on('select', e => {
			drawInteractionRef.current?.setActive(e.selected.length > 0 ? false : true)
			console.log('选中了', e.selected)
		})
		// 增加修改功能
		modifyInteractionRef.current = new Modify({ features: selectInteractionRef.current.getFeatures() })
		// 增加平移功能
		translateInteractionRef.current = new Translate({ features: selectInteractionRef.current.getFeatures() })
		// 增加绘制功能
		drawInteractionRef.current = new Draw({
			type: 'Polygon',
			source: layer.getSource()!,
			snapTolerance: 20,
			freehand: true,
		})
		snapInteractionRef.current = new Snap({
			source: layer.getSource()!,
		})
		selectInteractionRef.current.setActive(false)
		modifyInteractionRef.current.setActive(false)
		translateInteractionRef.current.setActive(false)
		drawInteractionRef.current.setActive(false)
		snapInteractionRef.current.setActive(false)
		map.addInteraction(selectInteractionRef.current)
		map.addInteraction(modifyInteractionRef.current)
		map.addInteraction(translateInteractionRef.current)
		map.addInteraction(drawInteractionRef.current)
		map.addInteraction(snapInteractionRef.current)
	}

	const handleEdit = () => {
		selectInteractionRef.current?.setActive(!isEdit)
		drawInteractionRef.current?.setActive(!isEdit)
		snapInteractionRef.current?.setActive(!isEdit)
		modifyInteractionRef.current?.setActive(!isEdit)
		translateInteractionRef.current?.setActive(!isEdit)
		setIsEdit(!isEdit)
	}

	return (
		<>
			<div id='map'></div>
			<div ref={provinceSelectRef} id='province-select-control'>
				<TreeSelect
					getPopupContainer={() => document.getElementById('province-select-control')!}
					style={{ width: '100%' }}
					allowClear
					placeholder='请选择省份'
					treeData={cityData}
					onChange={value => {
						mapRef.current && handleAreaSelect(cityData.find(item => item.value === value)?.smid)
					}}
				/>
			</div>
			<div ref={editRef} id='edit-control'>
				<FloatButton
					shape='square'
					type='primary'
					tooltip={isEdit ? '取消编辑' : '编辑'}
					description={isEdit ? '取消编辑' : '编辑'}
					style={{ insetInlineEnd: 10, insetBlockEnd: 10 }}
					onClick={handleEdit}
				/>
			</div>
			<Spin spinning={isLoading} size='large' indicator={<LoadingOutlined spin />} tip='加载中...' fullscreen />
		</>
	)
}

export default App
