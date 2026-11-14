var tftpboot_state = {
	tree: [], policy: {}, syncDiff: [], bulkRows: [], bulkAllRows: [],
	bulkFilteredRows: [], bulkPage: 0, bulkPageSize: 50,
	directoryAllRows: [], directoryFilteredRows: [], directoryPage: 0, labels: {}
};

function tftpboot_init(opts) {
	tftpboot_state.policy = opts.policy || { mode: 'buttons_only', sections: ['dss'] };
	tftpboot_state.isAdmin = !!opts.isAdmin;
	tftpboot_state.bulkVendors = opts.bulkVendors || [];
	tftpboot_state.bulkPageSize = parseInt(opts.bulkPageSize, 10) || 50;
	if (tftpboot_state.bulkPageSize < 5) tftpboot_state.bulkPageSize = 5;
	if (tftpboot_state.bulkPageSize > 500) tftpboot_state.bulkPageSize = 500;
	tftpboot_state.labels = opts.labels || {};
	tftpboot_state.syncApiFetch = !!opts.syncApiFetch;
	tftpboot_state.syncHasUndo = !!opts.syncHasUndo;
	tftpboot_bind_tabs();
	tftpboot_render_bulk_vendors();
	tftpboot_render_sync_vendors();
	tftpboot_load_tree();
	var openBtn = document.getElementById('tftpboot-open-btn');
	if (openBtn) openBtn.onclick = tftpboot_open_selected;
	var bulkQ = document.getElementById('tftpboot-bulk-q');
	if (bulkQ) {
		bulkQ.oninput = tftpboot_bulk_filter;
		bulkQ.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); tftpboot_bulk_filter(); } };
	}
	var dirOpen = document.getElementById('tftpboot-directory-open');
	if (dirOpen) dirOpen.onclick = function () { tftpboot_directory_show(false); };
	var dirRefresh = document.getElementById('tftpboot-directory-refresh');
	if (dirRefresh) {
		dirRefresh.style.display = tftpboot_state.syncApiFetch ? '' : 'none';
		if (tftpboot_state.syncApiFetch) {
			dirRefresh.onclick = function () { tftpboot_directory_show(true); };
		}
	}
	var dirQ = document.getElementById('tftpboot-directory-q');
	if (dirQ) {
		dirQ.oninput = tftpboot_directory_filter;
		dirQ.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); tftpboot_directory_filter(); } };
	}
	var syncPreview = document.getElementById('tftpboot-sync-preview');
	if (syncPreview) syncPreview.onclick = tftpboot_sync_preview;
	var syncApply = document.getElementById('tftpboot-sync-apply');
	if (syncApply) syncApply.onclick = tftpboot_sync_apply;
	var syncUndo = document.getElementById('tftpboot-sync-undo');
	if (syncUndo) {
		syncUndo.style.display = tftpboot_state.syncHasUndo ? '' : 'none';
		syncUndo.onclick = tftpboot_sync_undo;
	}
}

function tftpboot_bind_admin() {
	document.querySelectorAll('.tftpboot-override-save').forEach(function (btn) {
		btn.onclick = function () { tftpboot_override_save(btn.getAttribute('data-file')); };
	});
}

function tftpboot_bind_tabs() {
	document.querySelectorAll('.tftpboot-tab').forEach(function (btn) {
		btn.onclick = function () {
			document.querySelectorAll('.tftpboot-tab').forEach(function (b) { b.classList.remove('active'); });
			btn.classList.add('active');
			var tab = btn.getAttribute('data-tab');
			document.querySelectorAll('.tftpboot-panel').forEach(function (p) { p.style.display = 'none'; });
			var panel = document.getElementById('tftpboot-panel-' + tab);
			if (panel) panel.style.display = 'block';
			if (tab === 'bulk') tftpboot_bulk_fetch();
		};
	});
}

function tftpboot_render_sync_vendors() {
	var box = document.getElementById('tftpboot-sync-vendors');
	if (!box) return;
	box.innerHTML = '';
	tftpboot_state.bulkVendors.forEach(function (v) {
		var lbl = document.createElement('label');
		var chk = document.createElement('input');
		chk.type = 'checkbox';
		chk.className = 'tftpboot-sync-vendor';
		chk.value = v;
		chk.checked = String(v).toLowerCase() === 'fanvil';
		lbl.appendChild(chk);
		lbl.appendChild(document.createTextNode(' ' + v));
		box.appendChild(lbl);
	});
}

function tftpboot_selected_sync_vendors() {
	var v = [];
	document.querySelectorAll('.tftpboot-sync-vendor:checked').forEach(function (el) { v.push(el.value); });
	return v;
}

function tftpboot_render_bulk_vendors() {
	var box = document.getElementById('tftpboot-bulk-vendors');
	if (!box) return;
	box.innerHTML = '';
	tftpboot_state.bulkVendors.forEach(function (v) {
		var lbl = document.createElement('label');
		var chk = document.createElement('input');
		chk.type = 'checkbox';
		chk.className = 'tftpboot-bulk-vendor';
		chk.value = v;
		chk.checked = true;
		chk.onchange = function () { tftpboot_bulk_fetch(); };
		lbl.appendChild(chk);
		lbl.appendChild(document.createTextNode(' ' + v));
		box.appendChild(lbl);
	});
}

function tftpboot_http(action, data, cb, timeoutMs) {
	if (!timeoutMs) {
		f_http(g_link_prefix + action, cb, null, 'application/json', JSON.stringify(data || {}));
		return;
	}
	var xhr = typeof f_xhr === 'function' ? f_xhr() : null;
	if (!xhr) {
		f_http(g_link_prefix + action, cb, null, 'application/json', JSON.stringify(data || {}));
		return;
	}
	xhr.open('post', g_link_prefix + action, true);
	xhr.timeout = timeoutMs;
	xhr.onreadystatechange = function () {
		if (xhr.readyState !== 4) return;
		var result;
		if (xhr.status === 200) {
			try {
				result = JSON.parse(xhr.responseText);
			} catch (e) {
				result = { code: 1, message: 'Response: ' + xhr.responseText };
			}
		} else if (xhr.status === 0) {
			result = { code: 1, message: 'AJAX error: timeout or connection lost' };
		} else {
			result = { code: 1, message: 'AJAX error code: ' + xhr.status };
		}
		if (cb) cb(result);
	};
	xhr.ontimeout = function () {
		if (cb) cb({ code: 1, message: 'AJAX error: timeout or connection lost' });
	};
	xhr.setRequestHeader('Content-Type', 'application/json');
	xhr.send(JSON.stringify(data || {}));
}

function tftpboot_http_long(action, data, cb) {
	tftpboot_http(action, data, cb, 600000);
}

function tftpboot_load_tree() {
	tftpboot_http('tftpboot_tree', {}, function (res) {
		if (!res || res.code) return;
		tftpboot_state.tree = res.tree || [];
		tftpboot_fill_vendor_select();
	});
}

function tftpboot_fill_vendor_select() {
	var sel = document.getElementById('tftpboot-vendor');
	var msel = document.getElementById('tftpboot-model');
	var fsel = document.getElementById('tftpboot-file');
	sel.innerHTML = '<option value=""></option>';
	msel.innerHTML = '';
	fsel.innerHTML = '';
	tftpboot_state.tree.forEach(function (v, i) {
		var o = document.createElement('option');
		o.value = i;
		o.textContent = v.title;
		sel.appendChild(o);
	});
	var defVi = -1;
	tftpboot_state.tree.forEach(function (v, i) {
		if (v.id === 'fanvil') defVi = i;
	});
	if (defVi < 0) {
		tftpboot_state.tree.forEach(function (v, i) {
			if (v.title === 'Fanvil') defVi = i;
		});
	}
	if (defVi >= 0) {
		sel.value = String(defVi);
	}
	sel.onchange = function () {
		msel.innerHTML = '';
		fsel.innerHTML = '';
		var vi = parseInt(sel.value, 10);
		if (isNaN(vi) || !tftpboot_state.tree[vi]) return;
		tftpboot_state.tree[vi].models.forEach(function (m, mi) {
			var o = document.createElement('option');
			o.value = mi;
			o.textContent = m.title + ' (' + m.files.length + ')';
			msel.appendChild(o);
		});
		msel.onchange();
	};
	msel.onchange = function () {
		fsel.innerHTML = '';
		var vi = parseInt(sel.value, 10);
		var mi = parseInt(msel.value, 10);
		if (isNaN(vi) || isNaN(mi)) return;
		var m = tftpboot_state.tree[vi].models[mi];
		if (!m) return;
		m.files.forEach(function (f) {
			var o = document.createElement('option');
			o.value = f.filename;
			o.textContent = f.label;
			fsel.appendChild(o);
		});
	};
	if (defVi >= 0) {
		sel.onchange();
	}
}

function tftpboot_open_selected() {
	var fsel = document.getElementById('tftpboot-file');
	var fn = fsel.value;
	if (!fn) return;
	tftpboot_open_editor(fn);
}

function tftpboot_open_editor(filename) {
	tftpboot_http('tftpboot_config_get', { filename: filename }, function (res) {
		if (!res || res.code) {
			f_notify(res && res.message ? res.message : 'Error', 'error');
			return;
		}
		tftpboot_show_editor(res.config);
	});
}

function tftpboot_section_kind(sectionTitle) {
	var t = (sectionTitle || '').toLowerCase().trim();
	if (t.indexOf('sidekey') >= 0) return 'sidekey';
	if (t.indexOf('softdss') >= 0) return 'softdss';
	if (/dsskey\s*config/.test(t)) return 'dsskey_page';
	return 'other';
}

function tftpboot_dial_has_bc(suffix) {
	return /@1\/bc/i.test(suffix || '');
}

function tftpboot_card_is_auto(card) {
	if (card.dataset.fkeyAuto === '1') return true;
	var numEl = card.querySelector('.tftpboot-key-number');
	if (!numEl) return false;
	return String(numEl.value).trim().toUpperCase() === 'AUTO';
}

function tftpboot_sync_card_auto_state(card) {
	var isAuto = tftpboot_card_is_auto(card);
	if (isAuto) {
		card.dataset.fkeyAuto = '1';
		card.dataset.dialSuffix = '';
	} else {
		delete card.dataset.fkeyAuto;
	}
	tftpboot_update_phone_icon(card);
}

function tftpboot_update_phone_icon(card) {
	var btn = card.querySelector('.tftpboot-key-phone');
	if (!btn) return;
	if (tftpboot_card_is_auto(card)) {
		btn.disabled = true;
		btn.classList.remove('tftpboot-key-phone--green', 'tftpboot-key-phone--red', 'tftpboot-key-phone--neutral');
		btn.classList.add('tftpboot-key-phone--disabled');
		return;
	}
	btn.disabled = false;
	btn.classList.remove('tftpboot-key-phone--disabled');
	var suffix = card.dataset.dialSuffix || '';
	var isBc = tftpboot_dial_has_bc(suffix);
	var hasAt1 = /@1/.test(suffix);
	btn.classList.remove('tftpboot-key-phone--green', 'tftpboot-key-phone--red', 'tftpboot-key-phone--neutral');
	if (isBc) {
		btn.classList.add('tftpboot-key-phone--green');
	} else if (hasAt1) {
		btn.classList.add('tftpboot-key-phone--red');
	} else {
		btn.classList.add('tftpboot-key-phone--neutral');
	}
}

function tftpboot_key_phone_title() {
	if (tftpboot_state.labels && tftpboot_state.labels.keyPhone) return tftpboot_state.labels.keyPhone;
	if (typeof LL === 'object' && LL && LL.TftpBootKeyPhone) return LL.TftpBootKeyPhone;
	return 'Toggle @1/bc';
}

function tftpboot_dsskey_page_index(group, allDsskey) {
	var t = group.title || '';
	var m = t.match(/config\s*(\d+)/i);
	if (m) return parseInt(m[1], 10);
	var idx = allDsskey.indexOf(group);
	return idx >= 0 ? idx + 1 : 1;
}

function tftpboot_section_tab_title(group, allDsskey) {
	var base = tftpboot_editor_label('dsskey');
	var n = tftpboot_dsskey_page_index(group, allDsskey);
	var label = base + ' ' + n;
	var sameNum = allDsskey.filter(function (g) {
		return tftpboot_dsskey_page_index(g, allDsskey) === n;
	}).length;
	if (sameNum < 2) return label;
	var sec = group.section || '';
	var mod = sec.match(/^m(\d+)\//);
	if (mod) return label + ' [' + (parseInt(mod[1], 10) + 1) + ']';
	return label;
}

function tftpboot_group_keys_by_section(keys) {
	var groups = {};
	var order = [];
	(keys || []).forEach(function (k) {
		var sid = k.section || k.section_title || '_';
		if (!groups[sid]) {
			groups[sid] = { section: sid, title: k.section_title || sid, keys: [] };
			order.push(sid);
		}
		groups[sid].keys.push(k);
	});
	order.forEach(function (sid) {
		groups[sid].keys.sort(function (a, b) { return a.slot - b.slot; });
	});
	return { groups: groups, order: order };
}

function tftpboot_key_clear_title() {
	if (tftpboot_state.labels && tftpboot_state.labels.keyClear) return tftpboot_state.labels.keyClear;
	if (typeof LL === 'object' && LL && LL.TftpBootKeyClear) return LL.TftpBootKeyClear;
	return 'Clear';
}

function tftpboot_create_key_card(k, grid) {
	var card = document.createElement('div');
	card.className = 'tftpboot-key-card';
	card.draggable = true;
	card.dataset.slot = k.slot;
	if (k.key_id) card.dataset.keyId = k.key_id;
	if (k.section) card.dataset.section = k.section;
	var label = (k.section_title ? escapeHtml(k.section_title) + ' #' + k.slot : '#' + k.slot);
	var clrTitle = escapeHtml(tftpboot_key_clear_title());
	var phoneTitle = escapeHtml(tftpboot_key_phone_title());
	var dialSuffix = (k.dial_suffix !== undefined && k.dial_suffix !== null) ? String(k.dial_suffix) : '';
	if (k.fkey_auto || String(k.number || '').toUpperCase() === 'AUTO') {
		card.dataset.fkeyAuto = '1';
		dialSuffix = '';
	}
	if (!dialSuffix && k.value && !card.dataset.fkeyAuto) {
		var vm = String(k.value).trim().match(/^\d+(.*)$/);
		if (vm) dialSuffix = vm[1] || '';
	}
	card.dataset.dialSuffix = dialSuffix;
	card.innerHTML =
		'<span class="tftpboot-key-slot"><span class="tftpboot-key-slot-label">' + label + '</span>' +
		'<span class="tftpboot-key-slot-actions">' +
		'<button type="button" class="tftpboot-key-phone" title="' + phoneTitle + '" aria-label="' + phoneTitle + '">&#9742;</button>' +
		'<button type="button" class="tftpboot-key-clear" title="' + clrTitle + '">&times;</button>' +
		'</span></span>' +
		'<input type="text" class="tftpboot-key-title" value="' + escapeHtml(k.label || '') + '" placeholder="Title" />' +
		'<input type="text" class="tftpboot-key-number" value="' + escapeHtml(k.number || '') + '" placeholder="Number" />';
	tftpboot_update_phone_icon(card);
	var phoneBtn = card.querySelector('.tftpboot-key-phone');
	if (phoneBtn) {
		phoneBtn.onclick = function (e) {
			e.preventDefault();
			e.stopPropagation();
			if (tftpboot_card_is_auto(card) || phoneBtn.disabled) return;
			if (tftpboot_dial_has_bc(card.dataset.dialSuffix)) return;
			card.dataset.dialSuffix = '@1/bc';
			tftpboot_update_phone_icon(card);
			delete card.dataset.clear;
		};
	}
	var numInp = card.querySelector('.tftpboot-key-number');
	if (numInp) {
		numInp.addEventListener('input', function () {
			tftpboot_sync_card_auto_state(card);
		});
	}
	var clr = card.querySelector('.tftpboot-key-clear');
	clr.onclick = function (e) {
		e.preventDefault();
		e.stopPropagation();
		card.querySelector('.tftpboot-key-title').value = '';
		card.querySelector('.tftpboot-key-number').value = '';
		card.dataset.dialSuffix = '';
		delete card.dataset.fkeyAuto;
		tftpboot_update_phone_icon(card);
		card.dataset.clear = '1';
	};
	card.querySelectorAll('input').forEach(function (inp) {
		inp.addEventListener('input', function () { delete card.dataset.clear; });
	});
	tftpboot_sync_card_auto_state(card);
	tftpboot_bind_dnd(card, grid);
	return card;
}

function tftpboot_editor_label(key) {
	var labels = tftpboot_state.labels || {};
	if (key === 'sidekey' && labels.editorSidekey) return labels.editorSidekey;
	if (key === 'softdss' && labels.editorSoftdss) return labels.editorSoftdss;
	if (key === 'dsskey' && labels.editorDsskey) return labels.editorDsskey;
	if (typeof LL === 'object' && LL) {
		if (key === 'sidekey' && LL.TftpBootEditorSidekey) return LL.TftpBootEditorSidekey;
		if (key === 'softdss' && LL.TftpBootEditorSoftdss) return LL.TftpBootEditorSoftdss;
		if (key === 'dsskey' && LL.TftpBootEditorDsskey) return LL.TftpBootEditorDsskey;
	}
	if (key === 'sidekey') return 'Sidekey';
	if (key === 'softdss') return 'SoftDss';
	return 'Dsskey';
}

function tftpboot_append_collapsible(root, title, contentEl, collapsed, extraClass) {
	var sec = document.createElement('div');
	sec.className = 'tftpboot-editor-section tftpboot-editor-collapsible' + (collapsed ? ' tftpboot-editor-collapsed' : '');
	if (extraClass) sec.className += ' ' + extraClass;
	var head = document.createElement('button');
	head.type = 'button';
	head.className = 'tftpboot-editor-section-toggle';
	head.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
	head.innerHTML = '<span class="tftpboot-editor-section-caret" aria-hidden="true"></span>' +
		'<span class="tftpboot-editor-section-title">' + escapeHtml(title) + '</span>';
	var body = document.createElement('div');
	body.className = 'tftpboot-editor-section-body';
	body.appendChild(contentEl);
	head.onclick = function () {
		var isCollapsed = sec.classList.contains('tftpboot-editor-collapsed');
		sec.classList.toggle('tftpboot-editor-collapsed', !isCollapsed);
		head.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
	};
	sec.appendChild(head);
	sec.appendChild(body);
	root.appendChild(sec);
}

function tftpboot_append_section_panel(root, group, opts) {
	opts = opts || {};
	var grid = document.createElement('div');
	grid.className = 'tftpboot-keys-grid';
	group.keys.forEach(function (k) {
		grid.appendChild(tftpboot_create_key_card(k, grid));
	});
	var wrap = document.createElement('div');
	wrap.className = 'tftpboot-editor-section-inner' + (opts.sidekeyStyle ? ' tftpboot-section-sidekey-inner' : '');
	wrap.appendChild(grid);
	var title = opts.title != null ? opts.title : (group.title || group.section);
	tftpboot_append_collapsible(root, title, wrap, !!opts.collapsed, opts.sectionClass || '');
}

function tftpboot_append_dsskey_tabbed(root, dsskeyPages, collapsed) {
	dsskeyPages.sort(function (a, b) {
		return (a.title || '').localeCompare(b.title || '', undefined, { numeric: true, sensitivity: 'base' });
	});
	var inner = document.createElement('div');
	inner.className = 'tftpboot-dsskey-tabbed';
	var panels = document.createElement('div');
	panels.className = 'tftpboot-dsskey-panels';
	var tabs = document.createElement('div');
	tabs.className = 'tftpboot-dsskey-tabs';
	dsskeyPages.forEach(function (group, idx) {
		var panel = document.createElement('div');
		panel.className = 'tftpboot-keys-grid tftpboot-dsskey-panel';
		panel.dataset.panel = String(idx);
		if (idx > 0) panel.style.display = 'none';
		var grid = panel;
		group.keys.forEach(function (k) {
			panel.appendChild(tftpboot_create_key_card(k, grid));
		});
		panels.appendChild(panel);
		var btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'tftpboot-dsskey-tab' + (idx === 0 ? ' active' : '');
		btn.textContent = tftpboot_section_tab_title(group, dsskeyPages);
		btn.dataset.panel = String(idx);
		btn.onclick = function () {
			tabs.querySelectorAll('.tftpboot-dsskey-tab').forEach(function (b) { b.classList.remove('active'); });
			btn.classList.add('active');
			panels.querySelectorAll('.tftpboot-dsskey-panel').forEach(function (p) {
				p.style.display = p.dataset.panel === btn.dataset.panel ? '' : 'none';
			});
		};
		tabs.appendChild(btn);
	});
	inner.appendChild(panels);
	inner.appendChild(tabs);
	tftpboot_append_collapsible(root, tftpboot_editor_label('dsskey'), inner, !!collapsed, 'tftpboot-section-dsskey');
}

function tftpboot_show_editor(cfg) {
	document.getElementById('tftpboot-editor-filename').value = cfg.filename;
	document.getElementById('tftpboot-editor-title').textContent = cfg.label;
	var sipBox = document.getElementById('tftpboot-editor-sip');
	var policy = tftpboot_state.policy;
	sipBox.style.display = 'none';
	sipBox.innerHTML = '';
	if (policy.mode === 'full' || (policy.mode === 'custom' && policy.sections.indexOf('sip') >= 0)) {
		if (cfg.sip) {
			sipBox.style.display = 'block';
			var dn = cfg.displayName || '';
			var sipDispLbl = (tftpboot_state.labels && tftpboot_state.labels.sipDisplay)
				? tftpboot_state.labels.sipDisplay
				: ((typeof LL === 'object' && LL && LL.TftpBootSipDisplay) ? LL.TftpBootSipDisplay : 'Display');
			sipBox.innerHTML = '<label>' + escapeHtml(sipDispLbl) +
				' <input type="text" id="tftpboot-sip-display" value="' + escapeHtml(dn) + '" /></label>';
		}
	}
	var root = document.getElementById('tftpboot-editor-sections');
	root.innerHTML = '';
	var grouped = tftpboot_group_keys_by_section(cfg.speedDialKeys || []);
	var softdss = [];
	var dsskeyPages = [];
	var sidekey = [];
	var other = [];
	grouped.order.forEach(function (sid) {
		var g = grouped.groups[sid];
		var kind = tftpboot_section_kind(g.title);
		if (kind === 'softdss') softdss.push(g);
		else if (kind === 'dsskey_page') dsskeyPages.push(g);
		else if (kind === 'sidekey') sidekey.push(g);
		else other.push(g);
	});
	sidekey.forEach(function (g) {
		tftpboot_append_section_panel(root, g, {
			title: tftpboot_editor_label('sidekey'),
			collapsed: true,
			sidekeyStyle: true,
			sectionClass: 'tftpboot-section-sidekey'
		});
	});
	if (dsskeyPages.length >= 1) {
		tftpboot_append_dsskey_tabbed(root, dsskeyPages, false);
	}
	other.forEach(function (g) {
		tftpboot_append_section_panel(root, g, { collapsed: false });
	});
	softdss.forEach(function (g) {
		tftpboot_append_section_panel(root, g, {
			title: tftpboot_editor_label('softdss'),
			collapsed: true,
			sectionClass: 'tftpboot-section-softdss'
		});
	});
	document.getElementById('tftpboot-editor').style.display = 'block';
}

function tftpboot_bind_dnd(card, grid) {
	card.addEventListener('dragstart', function (e) {
		grid._tftpbootDragCard = card;
		e.dataTransfer.setData('text/plain', card.dataset.keyId || card.dataset.section + ':' + card.dataset.slot);
		card.classList.add('tftpboot-dragging');
	});
	card.addEventListener('dragend', function () {
		card.classList.remove('tftpboot-dragging');
		grid._tftpbootDragCard = null;
	});
	card.addEventListener('dragover', function (e) {
		e.preventDefault();
	});
	card.addEventListener('drop', function (e) {
		e.preventDefault();
		var from = grid._tftpbootDragCard;
		if (!from || from === card) return;
		if (from.dataset.section !== card.dataset.section) return;
		var fromTitle = from.querySelector('.tftpboot-key-title');
		var fromNum = from.querySelector('.tftpboot-key-number');
		var toTitle = card.querySelector('.tftpboot-key-title');
		var toNum = card.querySelector('.tftpboot-key-number');
		var t1 = fromTitle.value;
		var n1 = fromNum.value;
		var s1 = from.dataset.dialSuffix || '';
		fromTitle.value = toTitle.value;
		fromNum.value = toNum.value;
		toTitle.value = t1;
		toNum.value = n1;
		var s2 = card.dataset.dialSuffix || '';
		from.dataset.dialSuffix = s2;
		card.dataset.dialSuffix = s1;
		tftpboot_sync_card_auto_state(from);
		tftpboot_sync_card_auto_state(card);
		delete from.dataset.clear;
		delete card.dataset.clear;
	});
}

function tftpboot_close_editor() {
	document.getElementById('tftpboot-editor').style.display = 'none';
}

function tftpboot_save_editor() {
	var fn = document.getElementById('tftpboot-editor-filename').value;
	var keys = [];
	var clearIds = [];
	document.querySelectorAll('#tftpboot-editor-sections .tftpboot-key-card').forEach(function (card) {
		var row = {
			slot: parseInt(card.dataset.slot, 10),
			label: card.querySelector('.tftpboot-key-title').value,
			number: card.querySelector('.tftpboot-key-number').value,
			dial_suffix: card.dataset.dialSuffix || ''
		};
		if (card.dataset.keyId) row.key_id = card.dataset.keyId;
		if (card.dataset.section) row.section = card.dataset.section;
		keys.push(row);
		if (card.dataset.clear === '1' && card.dataset.keyId) {
			clearIds.push(card.dataset.keyId);
		}
	});
	var post = { filename: fn, speedDialKeys: keys, clear_key_ids: clearIds };
	var disp = document.getElementById('tftpboot-sip-display');
	if (disp) post.displayName = disp.value;
	tftpboot_http('tftpboot_config_save', post, function (res) {
		f_notify(res && res.message ? res.message : 'OK', res && res.code ? 'error' : 'success');
		if (res && !res.code) tftpboot_close_editor();
	});
}

function tftpboot_selected_vendors() {
	var v = [];
	document.querySelectorAll('.tftpboot-bulk-vendor:checked').forEach(function (el) { v.push(el.value); });
	return v;
}

function tftpboot_bulk_fetch() {
	var vendors = tftpboot_selected_vendors();
	if (!vendors.length) {
		tftpboot_state.bulkAllRows = [];
		tftpboot_bulk_filter();
		return;
	}
	var loading = document.getElementById('loading');
	if (loading) loading.style.display = 'block';
	tftpboot_http('tftpboot_keys_search', { q: '', vendors: vendors }, function (res) {
		if (loading) loading.style.display = 'none';
		if (!res || res.code) {
			f_notify(res && res.message ? res.message : 'Error', 'error');
			return;
		}
		tftpboot_state.bulkAllRows = res.rows || [];
		tftpboot_bulk_filter();
	});
}

function tftpboot_bulk_filter() {
	var qEl = document.getElementById('tftpboot-bulk-q');
	var q = qEl ? qEl.value.trim().toLowerCase() : '';
	var all = tftpboot_state.bulkAllRows || [];
	var filtered = all;
	if (q) {
		filtered = all.filter(function (r) {
			var hay = ((r.number || '') + ' ' + (r.title || '')).toLowerCase();
			return hay.indexOf(q) >= 0;
		});
	}
	tftpboot_state.bulkFilteredRows = filtered;
	tftpboot_state.bulkPage = 0;
	tftpboot_bulk_render_page();
}

function tftpboot_bulk_goto_page(page) {
	tftpboot_state.bulkPage = Math.max(0, parseInt(page, 10) || 0);
	tftpboot_bulk_render_page();
}

function tftpboot_bulk_render_page() {
	var rows = tftpboot_state.bulkFilteredRows || [];
	var psz = tftpboot_state.bulkPageSize;
	var pageCount = Math.max(1, Math.ceil(rows.length / psz) || 1);
	if (tftpboot_state.bulkPage >= pageCount) {
		tftpboot_state.bulkPage = pageCount - 1;
	}
	var start = tftpboot_state.bulkPage * psz;
	var pageRows = rows.length ? rows.slice(start, start + psz) : [];
	tftpboot_bulk_render_table(pageRows);
	tftpboot_bulk_render_pager(rows.length, pageCount);
}

function tftpboot_bulk_delete_label() {
	if (tftpboot_state.labels && tftpboot_state.labels.deleteBtn) {
		return tftpboot_state.labels.deleteBtn;
	}
	if (typeof LL === 'object' && LL && LL.Delete) {
		return LL.Delete;
	}

	return 'Delete';
}

function tftpboot_bulk_save_label() {
	if (tftpboot_state.labels && tftpboot_state.labels.save) {
		return tftpboot_state.labels.save;
	}
	if (typeof LL === 'object' && LL && LL.Save) {
		return LL.Save;
	}

	return 'Save';
}

function tftpboot_bulk_empty_label() {
	if (tftpboot_state.labels && tftpboot_state.labels.bulkEmpty) {
		return tftpboot_state.labels.bulkEmpty;
	}
	if (typeof LL === 'object' && LL && LL.TftpBootBulkEmpty) {
		return LL.TftpBootBulkEmpty;
	}

	return '—';
}

function tftpboot_bulk_location_title(locations) {
	var tpl = (tftpboot_state.labels && tftpboot_state.labels.bulkLocHint)
		? tftpboot_state.labels.bulkLocHint
		: '%1, line %2';
	var lines = [];
	(locations || []).forEach(function (loc) {
		if (!loc || !loc.file) return;
		var line = loc.line > 0 ? String(loc.line) : '?';
		lines.push(tpl.replace('%1', loc.file).replace('%2', line));
	});
	return lines.join('\n');
}

function tftpboot_bulk_render_table(rows) {
	tftpboot_state.bulkRows = rows;
	var tb = document.querySelector('#tftpboot-bulk-table tbody');
	if (!tb) return;
	tb.innerHTML = '';
	var saveLbl = escapeHtml(tftpboot_bulk_save_label());
	var delLbl = escapeHtml(tftpboot_bulk_delete_label());
	if (!tftpboot_state.bulkRows.length) {
		var tr = document.createElement('tr');
		tr.innerHTML = '<td colspan="4">' + escapeHtml(tftpboot_bulk_empty_label()) + '</td>';
		tb.appendChild(tr);
		return;
	}
	tftpboot_state.bulkRows.forEach(function (r, idx) {
		var tr = document.createElement('tr');
		var noTitle = !String(r.title || '').trim();
		var tipText = (noTitle && r.locations && r.locations.length)
			? tftpboot_bulk_location_title(r.locations)
			: '';
		var numTitle = tipText
			? ' title="' + escapeHtml(tipText).replace(/\n/g, '&#10;') + '"'
			: '';
		tr.innerHTML =
			'<td><input type="text" class="tftpboot-bulk-num" data-idx="' + idx + '" value="' + escapeHtml(r.number || '') + '"' + numTitle + ' /></td>' +
			'<td><input type="text" class="tftpboot-bulk-title" data-idx="' + idx + '" value="' + escapeHtml(r.title || '') + '" /></td>' +
			'<td class="tftpboot-bulk-count">' + (r.count || 0) + '</td>' +
			'<td class="tftpboot-bulk-actions">' +
			'<button type="button" class="button-other tftpboot-bulk-one" data-idx="' + idx + '">' + saveLbl + '</button> ' +
			'<button type="button" class="button-decline tftpboot-bulk-del" data-idx="' + idx + '">' + delLbl + '</button></td>';
		tb.appendChild(tr);
	});
	document.querySelectorAll('.tftpboot-bulk-one').forEach(function (btn) {
		btn.onclick = function () { tftpboot_bulk_save_one(parseInt(btn.getAttribute('data-idx'), 10)); };
	});
	document.querySelectorAll('.tftpboot-bulk-del').forEach(function (btn) {
		btn.onclick = function () { tftpboot_bulk_delete_one(parseInt(btn.getAttribute('data-idx'), 10)); };
	});
}

function tftpboot_bulk_delete_one(idx) {
	var r = tftpboot_state.bulkRows[idx];
	if (!r) return;
	var num = String(r.old_number !== undefined ? r.old_number : (r.number || '')).trim();
	var tpl = (tftpboot_state.labels && tftpboot_state.labels.bulkDeleteConfirm)
		? tftpboot_state.labels.bulkDeleteConfirm
		: 'Delete record %1?';
	var msg = tpl.replace('%1', num);
	var html = '<p>' + escapeHtml(msg) + '</p>';
	var go = function () {
		var item = {
			old_number: r.old_number || r.number,
			old_title: r.old_title !== undefined ? r.old_title : r.title
		};
		tftpboot_http('tftpboot_keys_bulk_delete', { items: [item], vendors: tftpboot_selected_vendors() }, function (res) {
			f_notify(res && res.message ? res.message : 'OK', res && res.code ? 'error' : 'success');
			if (res && !res.code) tftpboot_bulk_fetch();
		});
	};
	if (typeof f_confirm_dialog_show === 'function') {
		f_confirm_dialog_show(html, function (ok) { if (ok) go(); });
	} else if (window.confirm(msg)) {
		go();
	}
}

function tftpboot_render_pager(boxId, total, page, pageCount, onGoto) {
	var box = document.getElementById(boxId);
	if (!box) return;
	if (!total) {
		box.innerHTML = '';
		return;
	}
	var psz = tftpboot_state.bulkPageSize;
	var from = page * psz + 1;
	var to = Math.min(total, (page + 1) * psz);
	var tpl = (tftpboot_state.labels && tftpboot_state.labels.bulkPageInfo) ? tftpboot_state.labels.bulkPageInfo
		: ((typeof LL === 'object' && LL && LL.TftpBootBulkPageInfo) ? LL.TftpBootBulkPageInfo : '%1–%2 / %3');
	var info = tpl.replace('%1', from).replace('%2', to).replace('%3', total);
	var html = '<span class="tftpboot-bulk-page-info">' + escapeHtml(info) + '</span> ';
	var p;
	for (p = 0; p < pageCount; p++) {
		if (pageCount > 12 && p > 2 && p < pageCount - 3 && Math.abs(p - page) > 1) {
			if (p === 3 || p === pageCount - 4) {
				html += ' … ';
			}
			continue;
		}
		var cls = 'page-number' + (p === page ? ' boldtext' : '');
		html += '<a href="#" class="' + cls + '" data-page="' + p + '">' + (p + 1) + '</a> ';
	}
	box.innerHTML = html;
	box.querySelectorAll('a[data-page]').forEach(function (a) {
		a.onclick = function (e) {
			e.preventDefault();
			onGoto(a.getAttribute('data-page'));
		};
	});
}

function tftpboot_bulk_render_pager(total, pageCount) {
	tftpboot_render_pager('tftpboot-bulk-pages', total, tftpboot_state.bulkPage, pageCount, tftpboot_bulk_goto_page);
}

function tftpboot_bulk_save_one(idx) {
	var r = tftpboot_state.bulkRows[idx];
	if (!r) return;
	var numEl = document.querySelector('.tftpboot-bulk-num[data-idx="' + idx + '"]');
	var titEl = document.querySelector('.tftpboot-bulk-title[data-idx="' + idx + '"]');
	var item = {
		old_number: r.old_number || r.number,
		old_title: r.old_title !== undefined ? r.old_title : r.title,
		number: numEl ? numEl.value : r.number,
		title: titEl ? titEl.value : r.title
	};
	tftpboot_http('tftpboot_keys_bulk_save', { items: [item], vendors: tftpboot_selected_vendors() }, function (res) {
		var msg = res && res.message ? res.message : 'OK';
		if (res && res.keys) msg += ' (' + res.keys + ')';
		f_notify(msg, res && res.code ? 'error' : 'success');
		if (res && !res.code) tftpboot_bulk_fetch();
	});
}

function tftpboot_directory_goto_page(page) {
	tftpboot_state.directoryPage = Math.max(0, parseInt(page, 10) || 0);
	tftpboot_directory_render_page();
}

function tftpboot_directory_filter() {
	var qEl = document.getElementById('tftpboot-directory-q');
	var q = qEl ? qEl.value.trim().toLowerCase() : '';
	var all = tftpboot_state.directoryAllRows || [];
	var filtered = all;
	if (q) {
		filtered = all.filter(function (r) {
			var hay = ((r.number || '') + ' ' + (r.name || '')).toLowerCase();
			return hay.indexOf(q) >= 0;
		});
	}
	tftpboot_state.directoryFilteredRows = filtered;
	tftpboot_state.directoryPage = 0;
	tftpboot_directory_render_page();
}

function tftpboot_directory_render_page() {
	var rows = tftpboot_state.directoryFilteredRows
		|| tftpboot_state.directoryAllRows
		|| [];
	var psz = tftpboot_state.bulkPageSize;
	var pageCount = Math.max(1, Math.ceil(rows.length / psz) || 1);
	if (tftpboot_state.directoryPage >= pageCount) {
		tftpboot_state.directoryPage = pageCount - 1;
	}
	var start = tftpboot_state.directoryPage * psz;
	var pageRows = rows.length ? rows.slice(start, start + psz) : [];
	var tb = document.querySelector('#tftpboot-directory-table tbody');
	if (!tb) return;
	tb.innerHTML = '';
	pageRows.forEach(function (row) {
		var tr = document.createElement('tr');
		tr.innerHTML = '<td>' + escapeHtml(row.number) + '</td><td>' + escapeHtml(row.name) + '</td>';
		tb.appendChild(tr);
	});
	tftpboot_render_pager('tftpboot-directory-pages', rows.length, tftpboot_state.directoryPage, pageCount, tftpboot_directory_goto_page);
}

function tftpboot_directory_show(refresh) {
	tftpboot_http('tftpboot_directory', { refresh: refresh ? 1 : 0 }, function (res) {
		if (!res || res.code) return;
		tftpboot_state.directoryAllRows = res.rows || [];
		tftpboot_state.directoryFilteredRows = null;
		tftpboot_state.directoryPage = 0;
		var qEl = document.getElementById('tftpboot-directory-q');
		if (qEl) qEl.value = '';
		tftpboot_directory_filter();
		document.getElementById('tftpboot-directory-modal').style.display = 'block';
	});
}

function tftpboot_sync_label(key, fallback) {
	if (tftpboot_state.labels && tftpboot_state.labels[key]) {
		return tftpboot_state.labels[key];
	}
	if (typeof LL === 'object' && LL) {
		if (key === 'syncNoDiff' && LL.TftpBootSyncNoDiff) return LL.TftpBootSyncNoDiff;
		if (key === 'syncDiffSummary' && LL.TftpBootSyncDiffSummary) return LL.TftpBootSyncDiffSummary;
		if (key === 'syncConsensusNote' && LL.TftpBootSyncConsensusNote) return LL.TftpBootSyncConsensusNote;
	}
	return fallback;
}

function tftpboot_sync_preview() {
	var box = document.getElementById('tftpboot-sync-diff');
	var applyBtn = document.getElementById('tftpboot-sync-apply');
	if (box) box.innerHTML = '';
	if (applyBtn) applyBtn.style.display = 'none';
	var loading = document.getElementById('loading');
	if (loading) loading.style.display = 'block';
	var vendors = tftpboot_selected_sync_vendors();
	if (!vendors.length) {
		if (loading) loading.style.display = 'none';
		var msg = (typeof LL === 'object' && LL && LL.TftpBootBulkNoVendors) ? LL.TftpBootBulkNoVendors : 'Select vendors';
		f_notify(msg, 'error');
		return;
	}
	tftpboot_http_long('tftpboot_sync_preview', { vendors: vendors }, function (res) {
		if (loading) loading.style.display = 'none';
		if (!res || res.code) {
			f_notify(res && res.message ? res.message : 'Error', 'error');
			return;
		}
		tftpboot_state.syncDiff = res.diff || [];
		if (!box) return;
		box.innerHTML = '';
		var mapCnt = res.map_count != null ? res.map_count : '—';
		if (!tftpboot_state.syncDiff.length) {
			var tplEmpty = tftpboot_sync_label('syncNoDiff', 'No differences (%1).');
			box.innerHTML = '<p class="tftpboot-sync-msg">' + escapeHtml(tplEmpty.replace('%1', mapCnt)) + '</p>';
			return;
		}
		var tplSum = tftpboot_sync_label('syncDiffSummary', 'Key rows with differences: %1 (source %2).');
		var sum = document.createElement('p');
		sum.className = 'tftpboot-sync-msg';
		sum.textContent = tplSum.replace('%1', tftpboot_state.syncDiff.length).replace('%2', mapCnt);
		box.appendChild(sum);
		if (tftpboot_state.syncDiff.some(function (r) { return r.source === 'consensus'; })) {
			var note = document.createElement('p');
			note.className = 'tftpboot-sync-msg tftpboot-sync-note';
			note.textContent = tftpboot_sync_label('syncConsensusNote', 'Rows marked * use majority rule.');
			box.appendChild(note);
		}
		tftpboot_state.syncDiff.forEach(function (row, idx) {
			var div = document.createElement('div');
			div.className = 'tftpboot-diff-row' + (row.action === 'delete' ? ' tftpboot-diff-delete' : '');
			var cnt = row.count ? ' (' + row.count + ')' : '';
			var src = row.source === 'consensus' ? ' *' : '';
			var delLbl = (tftpboot_state.labels && tftpboot_state.labels.deleteBtn)
				? tftpboot_state.labels.deleteBtn
				: ((typeof LL === 'object' && LL && LL.Delete) ? LL.Delete : 'Delete');
			var html;
			if (row.action === 'delete') {
				html = '<label><input type="checkbox" class="tftpboot-sync-chk" data-idx="' + idx + '" checked /> '
					+ '<b>' + escapeHtml(row.number || '') + '</b>: '
					+ escapeHtml(delLbl) + ' — ' + escapeHtml(row.old_title || '') + escapeHtml(cnt) + '</label>';
			} else {
				html = '<label><input type="checkbox" class="tftpboot-sync-chk" data-idx="' + idx + '" checked /> '
					+ '<b>' + escapeHtml(row.number || '') + '</b>: '
					+ escapeHtml(row.old_title || '') + ' → ' + escapeHtml(row.title || '') + escapeHtml(cnt) + escapeHtml(src) + '</label>';
			}
			div.innerHTML = html;
			box.appendChild(div);
		});
		if (applyBtn) applyBtn.style.display = 'inline-block';
	});
}

function tftpboot_sync_set_undo_visible(show) {
	tftpboot_state.syncHasUndo = !!show;
	var btn = document.getElementById('tftpboot-sync-undo');
	if (btn) btn.style.display = show ? '' : 'none';
}

function tftpboot_sync_apply() {
	var items = [];
	document.querySelectorAll('.tftpboot-sync-chk:checked').forEach(function (chk) {
		var idx = parseInt(chk.getAttribute('data-idx'), 10);
		if (tftpboot_state.syncDiff[idx]) items.push(tftpboot_state.syncDiff[idx]);
	});
	if (!items.length) {
		f_notify('—', 'error');
		return;
	}
	var tpl = (tftpboot_state.labels && tftpboot_state.labels.syncApplyConfirm)
		? tftpboot_state.labels.syncApplyConfirm
		: 'Apply %1 records?';
	var msg = tpl.replace('%1', items.length);
	var go = function () {
		var vendors = tftpboot_selected_sync_vendors();
		if (!vendors.length) {
			f_notify((typeof LL === 'object' && LL && LL.TftpBootBulkNoVendors) ? LL.TftpBootBulkNoVendors : 'Select vendors', 'error');
			return;
		}
		var loading = document.getElementById('loading');
		if (loading) loading.style.display = 'block';
		tftpboot_http_long('tftpboot_sync_apply', { items: items, vendors: vendors }, function (res) {
			if (loading) loading.style.display = 'none';
			var text = res && res.message ? res.message : 'OK';
			if (res && res.keys) text += ' (' + res.keys + ')';
			f_notify(text, res && res.code ? 'error' : 'success');
			if (res && !res.code) {
				tftpboot_sync_set_undo_visible(!!res.has_undo);
				document.getElementById('tftpboot-sync-apply').style.display = 'none';
				var box = document.getElementById('tftpboot-sync-diff');
				if (box) box.innerHTML = '';
			}
		});
	};
	var html = '<p>' + escapeHtml(msg) + '</p>';
	if (typeof f_confirm_dialog_show === 'function') {
		f_confirm_dialog_show(html, function (ok) { if (ok) go(); });
	} else if (window.confirm(msg)) {
		go();
	}
}

function tftpboot_sync_undo() {
	var tpl = (tftpboot_state.labels && tftpboot_state.labels.syncUndoConfirm)
		? tftpboot_state.labels.syncUndoConfirm
		: 'Undo last sync apply?';
	var go = function () {
		var loading = document.getElementById('loading');
		if (loading) loading.style.display = 'block';
		tftpboot_http_long('tftpboot_sync_undo', {}, function (res) {
			if (loading) loading.style.display = 'none';
			var text = res && res.message ? res.message : 'OK';
			if (res && res.keys) text += ' (' + res.keys + ')';
			f_notify(text, res && res.code ? 'error' : 'success');
			if (res && !res.code) {
				tftpboot_sync_set_undo_visible(!!res.has_undo);
			}
		});
	};
	var html = '<p>' + escapeHtml(tpl) + '</p>';
	if (typeof f_confirm_dialog_show === 'function') {
		f_confirm_dialog_show(html, function (ok) { if (ok) go(); });
	} else if (window.confirm(tpl)) {
		go();
	}
}

function tftpboot_admin_save(form) {
	var data = {};
	var fd = new FormData(form);
	data.editor_vendors = [];
	data.bulk_vendors = [];
	fd.forEach(function (val, key) {
		if (key === 'editor_vendors[]') {
			data.editor_vendors.push(val);
		} else if (key === 'bulk_vendors[]') {
			data.bulk_vendors.push(val);
		} else {
			data[key] = val;
		}
	});
	if (!data.sync_auto) data.sync_auto = '0';
	tftpboot_http('tftpboot_admin_catalog_save', data, function (res) {
		f_notify(res && res.message ? res.message : 'OK', res && res.code ? 'error' : 'success');
	});
	return false;
}

function tftpboot_override_save(filename) {
	var row = document.querySelector('.tftpboot-override-save[data-file="' + filename + '"]');
	if (!row) return;
	var tr = row.closest('tr');
	var vendor = tr.querySelector('.tftpboot-override-vendor').value;
	var model = tr.querySelector('.tftpboot-override-model').value;
	tftpboot_http('tftpboot_admin_override_save', { filename: filename, vendor: vendor, model: model }, function (res) {
		f_notify(res && res.message ? res.message : 'OK', res && res.code ? 'error' : 'success');
	});
}

function tftpboot_policy_save() {
	var dn = document.getElementById('tftpboot-policy-dn').value;
	var mode = document.getElementById('tftpboot-policy-mode').value;
	var sections = [];
	document.querySelectorAll('.tftpboot-policy-sec:checked').forEach(function (el) { sections.push(el.value); });
	tftpboot_http('tftpboot_admin_policy_save', { dn: dn, mode: mode, sections: sections }, function (res) {
		f_notify(res && res.message ? res.message : 'OK', res && res.code ? 'error' : 'success');
		if (res && !res.code) window.location.reload();
	});
}

function tftpboot_rescan_label(key, fallback) {
	if (tftpboot_state.labels && tftpboot_state.labels[key]) {
		return tftpboot_state.labels[key];
	}
	if (typeof LL === 'object' && LL && LL[key]) {
		return LL[key];
	}
	return fallback;
}

function tftpboot_rescan_admin() {
	tftpboot_http('tftpboot_rescan', {}, function (res) {
		f_notify(res && res.message ? res.message : 'OK', res && res.code ? 'error' : 'success');
		if (!res || res.code) return;
		var models = res.new_models;
		if (!models || !models.length) return;

		var intro = tftpboot_rescan_label('catalogNewModelsIntro',
			'Scan found models missing from the catalog. Add to tftpboot_catalog.json?');
		var lineTpl = tftpboot_rescan_label('catalogNewModelsLine',
			'%1 — %2 (id: %3, DSS: %4, files: %5)');
		var html = '<p>' + escapeHtml(intro) + '</p><ul class="tftpboot-new-models">';
		models.forEach(function (m) {
			var vendor = m.vendor || '';
			var title = m.suggested_title || m.hint || '';
			var id = m.suggested_id || '';
			var dss = m.dss_slots != null ? String(m.dss_slots) : '';
			var cnt = m.file_count != null ? String(m.file_count) : '';
			var line = lineTpl.replace('%1', vendor).replace('%2', title).replace('%3', id)
				.replace('%4', dss).replace('%5', cnt);
			html += '<li>' + escapeHtml(line) + '</li>';
		});
		html += '</ul>';
		var go = function () {
			tftpboot_http_long('tftpboot_catalog_add_suggested', { models: models }, function (res2) {
				var text = res2 && res2.message
					? res2.message
					: tftpboot_rescan_label('catalogModelsAdded', 'Models added');
				f_notify(text, res2 && res2.code ? 'error' : 'success');
				if (res2 && !res2.code) window.location.reload();
			});
		};
		if (typeof f_confirm_dialog_show === 'function') {
			f_confirm_dialog_show(html, function (ok) { if (ok) go(); });
		} else if (window.confirm(intro)) {
			go();
		}
	});
	return false;
}
