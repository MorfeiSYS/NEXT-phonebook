var tftpboot_state = {
	tree: [], policy: {}, syncDiff: [], bulkRows: [], bulkAllRows: [],
	bulkFilteredRows: [], bulkPage: 0, bulkPageSize: 50, labels: {}
};

function tftpboot_init(opts) {
	tftpboot_state.policy = opts.policy || { mode: 'buttons_only', sections: ['dss'] };
	tftpboot_state.isAdmin = !!opts.isAdmin;
	tftpboot_state.bulkVendors = opts.bulkVendors || [];
	tftpboot_state.bulkPageSize = parseInt(opts.bulkPageSize, 10) || 50;
	if (tftpboot_state.bulkPageSize < 5) tftpboot_state.bulkPageSize = 5;
	if (tftpboot_state.bulkPageSize > 500) tftpboot_state.bulkPageSize = 500;
	tftpboot_state.labels = opts.labels || {};
	tftpboot_bind_tabs();
	tftpboot_render_bulk_vendors();
	tftpboot_load_tree();
	var openBtn = document.getElementById('tftpboot-open-btn');
	if (openBtn) openBtn.onclick = tftpboot_open_selected;
	var bulkQ = document.getElementById('tftpboot-bulk-q');
	if (bulkQ) {
		bulkQ.oninput = tftpboot_bulk_filter;
		bulkQ.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); tftpboot_bulk_filter(); } };
	}
	var dirOpen = document.getElementById('tftpboot-directory-open');
	if (dirOpen) dirOpen.onclick = tftpboot_directory_show;
	var dirRefresh = document.getElementById('tftpboot-directory-refresh');
	if (dirRefresh) dirRefresh.onclick = function () { tftpboot_directory_show(true); };
	var syncPreview = document.getElementById('tftpboot-sync-preview');
	if (syncPreview) syncPreview.onclick = tftpboot_sync_preview;
	var syncApply = document.getElementById('tftpboot-sync-apply');
	if (syncApply) syncApply.onclick = tftpboot_sync_apply;
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

function tftpboot_http(action, data, cb) {
	f_http(g_link_prefix + action, cb, null, 'application/json', JSON.stringify(data || {}));
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
			sipBox.innerHTML = '<label>Display <input type="text" id="tftpboot-sip-display" value="' + escapeHtml(dn) + '" /></label>';
		}
	}
	var grid = document.getElementById('tftpboot-editor-keys');
	grid.innerHTML = '';
	cfg.speedDialKeys.forEach(function (k) {
		var card = document.createElement('div');
		card.className = 'tftpboot-key-card';
		card.draggable = true;
		card.dataset.slot = k.slot;
		if (k.key_id) card.dataset.keyId = k.key_id;
		if (k.section) card.dataset.section = k.section;
		var sec = k.section_title ? escapeHtml(k.section_title) + ' ' : '';
		card.innerHTML =
			'<span class="tftpboot-key-slot">' + sec + '#' + k.slot + '</span>' +
			'<input type="text" class="tftpboot-key-title" value="' + escapeHtml(k.label || '') + '" placeholder="Title" />' +
			'<input type="text" class="tftpboot-key-number" value="' + escapeHtml(k.number || '') + '" placeholder="Number" />';
		tftpboot_bind_dnd(card, grid);
		grid.appendChild(card);
	});
	document.getElementById('tftpboot-editor').style.display = 'block';
}

function tftpboot_bind_dnd(card, grid) {
	card.addEventListener('dragstart', function (e) {
		e.dataTransfer.setData('text/plain', card.dataset.slot);
		card.classList.add('tftpboot-dragging');
	});
	card.addEventListener('dragend', function () {
		card.classList.remove('tftpboot-dragging');
	});
	card.addEventListener('dragover', function (e) {
		e.preventDefault();
	});
	card.addEventListener('drop', function (e) {
		e.preventDefault();
		var fromSlot = e.dataTransfer.getData('text/plain');
		var from = grid.querySelector('[data-slot="' + fromSlot + '"]');
		if (from && from !== card) {
			grid.insertBefore(from, card);
		}
	});
}

function tftpboot_close_editor() {
	document.getElementById('tftpboot-editor').style.display = 'none';
}

function tftpboot_save_editor() {
	var fn = document.getElementById('tftpboot-editor-filename').value;
	var keys = [];
	document.querySelectorAll('#tftpboot-editor-keys .tftpboot-key-card').forEach(function (card) {
		var row = {
			slot: parseInt(card.dataset.slot, 10),
			label: card.querySelector('.tftpboot-key-title').value,
			number: card.querySelector('.tftpboot-key-number').value
		};
		if (card.dataset.keyId) row.key_id = card.dataset.keyId;
		if (card.dataset.section) row.section = card.dataset.section;
		keys.push(row);
	});
	var slot_order = [];
	document.querySelectorAll('#tftpboot-editor-keys .tftpboot-key-card').forEach(function (card) {
		slot_order.push(card.dataset.keyId || parseInt(card.dataset.slot, 10));
	});
	var post = { filename: fn, speedDialKeys: keys, slot_order: slot_order };
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

function tftpboot_bulk_render_pager(total, pageCount) {
	var box = document.getElementById('tftpboot-bulk-pages');
	if (!box) return;
	if (!total) {
		box.innerHTML = '';
		return;
	}
	var psz = tftpboot_state.bulkPageSize;
	var page = tftpboot_state.bulkPage;
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
			tftpboot_bulk_goto_page(a.getAttribute('data-page'));
		};
	});
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

function tftpboot_directory_show(refresh) {
	tftpboot_http('tftpboot_directory', { refresh: refresh ? 1 : 0 }, function (res) {
		if (!res || res.code) return;
		var tb = document.querySelector('#tftpboot-directory-table tbody');
		tb.innerHTML = '';
		(res.rows || []).forEach(function (row) {
			var tr = document.createElement('tr');
			tr.innerHTML = '<td>' + escapeHtml(row.number) + '</td><td>' + escapeHtml(row.name) + '</td>';
			tb.appendChild(tr);
		});
		document.getElementById('tftpboot-directory-modal').style.display = 'block';
	});
}

function tftpboot_sync_preview() {
	tftpboot_http('tftpboot_sync_preview', {}, function (res) {
		if (!res || res.code) return;
		tftpboot_state.syncDiff = res.diff || [];
		var box = document.getElementById('tftpboot-sync-diff');
		box.innerHTML = '';
		tftpboot_state.syncDiff.forEach(function (row, idx) {
			var div = document.createElement('div');
			div.className = 'tftpboot-diff-row';
			var html = '<label><input type="checkbox" class="tftpboot-sync-chk" data-idx="' + idx + '" checked /> <b>' + escapeHtml(row.label) + '</b></label><ul>';
			row.changes.forEach(function (ch) {
				html += '<li>' + escapeHtml(ch.field) + ': ' + escapeHtml(ch.old) + ' → ' + escapeHtml(ch.new) + '</li>';
			});
			html += '</ul>';
			div.innerHTML = html;
			box.appendChild(div);
		});
		document.getElementById('tftpboot-sync-apply').style.display = tftpboot_state.syncDiff.length ? 'inline-block' : 'none';
	});
}

function tftpboot_sync_apply() {
	var items = [];
	document.querySelectorAll('.tftpboot-sync-chk:checked').forEach(function (chk) {
		var idx = parseInt(chk.getAttribute('data-idx'), 10);
		if (tftpboot_state.syncDiff[idx]) items.push(tftpboot_state.syncDiff[idx]);
	});
	tftpboot_http('tftpboot_sync_apply', { items: items }, function (res) {
		f_notify(res && res.message ? res.message : 'OK', res && res.code ? 'error' : 'success');
	});
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

function tftpboot_rescan_admin() {
	tftpboot_http('tftpboot_rescan', {}, function (res) {
		f_notify(res && res.message ? res.message : 'OK', res && res.code ? 'error' : 'success');
	});
	return false;
}
