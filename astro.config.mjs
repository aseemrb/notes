// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeRapide from 'starlight-theme-rapide';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import autoImport from 'astro-auto-import';
import { katexMacros } from './src/katex-macros.mjs';

// https://astro.build/config
export default defineConfig({
	site: 'https://notes.aseemrb.me',
	markdown: {
		remarkPlugins: [remarkMath],
		rehypePlugins: [[rehypeKatex, { macros: katexMacros }]],
	},
	integrations: [

		starlight({
			plugins: [starlightThemeRapide()],
			title: 'Notes',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/aseemrb/notes' }],
			head: [
				{
					tag: 'link',
					attrs: {
						rel: 'stylesheet',
						href: 'https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/katex.min.css',
					},
				},
			], 
			sidebar: [
				{
					label: 'Linear Algebra',
					collapsed: true,
					items: [
						{ slug: 'linear-algebra', label: 'Introduction' },
						{ label: 'Fundamentals', collapsed: true, autogenerate: { directory: 'linear-algebra/fundamentals', collapsed: true } },
						{ label: 'Spectral Theory', collapsed: true, autogenerate: { directory: 'linear-algebra/spectral-theory', collapsed: true } },
					],
				},
				{
					label: 'Probability Theory',
					collapsed: true,
					items: [
						{ slug: 'probability-theory', label: 'Introduction' },
						{ label: 'Probability Spaces', collapsed: true, autogenerate: { directory: 'probability-theory/probability-spaces', collapsed: true } },
						{ label: 'Events', collapsed: true, autogenerate: { directory: 'probability-theory/events', collapsed: true } },
					],
				},
			],
			customCss: ['./src/styles/custom.css'],
		}),
		autoImport({
			imports: [
				{
					'@astrojs/starlight/components': ['Card', 'Aside', 'Steps', 'Tabs', 'TabItem'],
				},
			],
		}),
	],
});
