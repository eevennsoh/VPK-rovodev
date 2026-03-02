const { chromium } = require('@playwright/test');

(async () => {
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	const url = 'http://localhost:3000/make?tab=chat';
	console.log('Navigating:', url);
	await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

	const chatTextareaHandle = await page.waitForFunction(() => {
		const textareas = Array.from(document.querySelectorAll('textarea'));
		const visible = textareas.filter((ta) => {
			const cs = getComputedStyle(ta);
			const r = ta.getBoundingClientRect();
			return cs.visibility !== 'hidden' && cs.display !== 'none' && r.width > 100 && r.height > 20;
		});
		const scored = visible
			.map((ta) => {
				const ph = (ta.getAttribute('placeholder') || '').toLowerCase();
				const form = ta.closest('form');
				const rect = ta.getBoundingClientRect();
				let score = 0;
				if (form) score += 2;
				if (/message|ask|prompt|chat|type/.test(ph)) score += 4;
				if (/webhook|url/.test(ph)) score -= 5;
				if (rect.top > window.innerHeight * 0.45) score += 1;
				return { ta, score, ph, top: rect.top };
			})
			.sort((a, b) => b.score - a.score || b.top - a.top);
		const best = scored[0]?.ta || null;
		if (best) {
			best.setAttribute('data-pw-target', 'active-chat-composer');
			return true;
		}
		return false;
	}, { timeout: 30000 });
	await chatTextareaHandle;

	const textarea = page.locator('textarea[data-pw-target="active-chat-composer"]').first();
	await textarea.waitFor({ state: 'visible', timeout: 30000 });

	const placeholder = await textarea.getAttribute('placeholder');
	console.log('Using textarea placeholder:', placeholder || '(none)');

	await textarea.fill('hi');
	await textarea.press('Enter').catch(() => {});

	const sendBtn = page.locator('form:has(textarea[data-pw-target="active-chat-composer"]) button[type="submit"], button[aria-label*="send" i]').first();
	if (await sendBtn.count()) {
		try {
			if (await sendBtn.isVisible()) {
				await sendBtn.click({ timeout: 2000 });
			}
		} catch {}
	}

	const assistantAppeared = await Promise.race([
		page.waitForSelector('[data-role="assistant"], [data-message-role="assistant"], [data-testid*="assistant" i], [class*="assistant" i]', { timeout: 45000 }).then(() => true).catch(() => false),
		page.waitForFunction(() => {
			const messages = Array.from(document.querySelectorAll('article, [role="article"], [data-message-id], li, [class*="message" i]'));
			return messages.some((m) => {
				const role = (m.getAttribute('data-role') || '') + ' ' + (m.getAttribute('data-message-role') || '');
				const cls = String(m.className || '');
				const txt = (m.textContent || '').trim();
				return /assistant/i.test(role) || /assistant/i.test(cls) || txt.length > 0;
			});
		}, { timeout: 45000 }).then(() => true).catch(() => false),
	]);
	console.log(assistantAppeared ? 'Assistant response/container detected.' : 'Assistant response/container not detected in timeout.');

	const measure = async (label) => {
		return await page.evaluate((lab) => {
			const ta = document.querySelector('textarea[data-pw-target="active-chat-composer"]');
			if (!ta) return { label: lab, vals: null };
			const composer = ta.closest('form, [data-testid*="composer" i], [class*="composer" i], [class*="prompt" i]') || ta.parentElement;
			const taRect = ta.getBoundingClientRect();
			const compRect = composer ? composer.getBoundingClientRect() : null;
			return {
				label: lab,
				vals: {
					textarea_clientHeight: ta.clientHeight,
					textarea_scrollHeight: ta.scrollHeight,
					textarea_offsetHeight: ta.offsetHeight,
					textarea_rect_height: Number(taRect.height.toFixed(2)),
					composer_clientHeight: composer ? composer.clientHeight : null,
					composer_scrollHeight: composer ? composer.scrollHeight : null,
					composer_offsetHeight: composer ? composer.offsetHeight : null,
					composer_rect_height: compRect ? Number(compRect.height.toFixed(2)) : null,
				},
			};
		}, label);
	};

	const before = await measure('before_multiline');
	await textarea.fill('line 1\nline 2\nline 3\nline 4');
	await page.waitForTimeout(500);
	const after = await measure('after_multiline');

	console.log('MEASUREMENTS');
	console.log(JSON.stringify({ before, after }, null, 2));

	await browser.close();
})();
