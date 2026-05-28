// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeRapide from 'starlight-theme-rapide';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import autoImport from 'astro-auto-import';
import preact from '@astrojs/preact';
import { katexMacros } from './src/katex-macros.mjs';

// https://astro.build/config
export default defineConfig({
	site: 'https://notes.aseemrb.me',
	markdown: {
		remarkPlugins: [remarkMath],
		rehypePlugins: [[rehypeKatex, { macros: katexMacros }]],
	},
	integrations: [
		preact(),
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
					collapsed: false,
					items: [
						{ slug: 'linear-algebra', label: 'Introduction' },
						{ label: 'Fundamentals', collapsed: true, items: [{ autogenerate: { directory: 'linear-algebra/fundamentals', collapsed: true } }] },
						{ label: 'Least Squares', collapsed: true, items: [{ autogenerate: { directory: 'linear-algebra/least-squares', collapsed: true } }] },
						{ label: 'Computations', collapsed: true, items: [{ autogenerate: { directory: 'linear-algebra/computations', collapsed: true } }] },
						{ label: 'Optimization', collapsed: true, items: [{ autogenerate: { directory: 'linear-algebra/optimization', collapsed: true } }] },
					],
				},
				{
					label: 'Probability Theory',
					collapsed: false,
					items: [
						{ slug: 'probability-theory', label: 'Introduction' },
						{ label: 'Probability Spaces', collapsed: true, items: [{ autogenerate: { directory: 'probability-theory/probability-spaces', collapsed: true } }] },
						{ label: 'Events & Random Variables', collapsed: true, items: [{ autogenerate: { directory: 'probability-theory/events', collapsed: true } }] },
						{ label: 'Lebesgue Integration', collapsed: true, items: [{ autogenerate: { directory: 'probability-theory/lebesgue-integration', collapsed: true } }] },
						{ label: 'Independence', collapsed: true, items: [{ autogenerate: { directory: 'probability-theory/independence', collapsed: true } }] },
						{ label: 'Convergence', collapsed: true, items: [{ autogenerate: { directory: 'probability-theory/convergence', collapsed: true } }] },
						{ label: 'Laws of Large Numbers', collapsed: true, items: [{ autogenerate: { directory: 'probability-theory/laws-of-large-numbers', collapsed: true } }] },
						{ label: 'Central Limit Theorem', collapsed: true, items: [{ autogenerate: { directory: 'probability-theory/central-limit-theorem', collapsed: true } }] },
						{ label: 'Conditional Expectation', collapsed: true, items: [{ autogenerate: { directory: 'probability-theory/conditional-expectation', collapsed: true } }] },
						{ label: 'Martingale Theory', collapsed: true, items: [{ autogenerate: { directory: 'probability-theory/martingale-theory', collapsed: true } }] },
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
