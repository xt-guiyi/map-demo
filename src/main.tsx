/*
 * @Author: xt 1661219752@qq.com
 * @Date: 2024-08-23 11:10:40
 * @LastEditors: xt-guiyi 1661219752@qq.com
 * @LastEditTime: 2024-08-31 03:34:33
 * @Description:
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ConfigProvider } from 'antd'

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<ConfigProvider
			theme={{
				token: {
					// Seed Token，影响范围大
					colorPrimary: '#00b96b',
					borderRadius: 6,
					// 派生变量，影响范围小
					colorBgContainer: '#f6ffed',
				},
				cssVar: true,
				hashed: false,
			}}>
			<App />
		</ConfigProvider>
	</StrictMode>
)
