var tftpboot_state = { tree: [], policy: {}, syncDiff: [], bulkRows: [] };

function tftpboot_init(opts) {
	tftpboot_state.policy = opts.policy || { mode: 'buttons_only', sections: ['dss'] };
	tftpboot_state.isAdmin = !!opts.isAdmin;
	tftpboot_state.bulkVendors = opts.bulkVendors || [];
	tftpboot_bind_tabs();
	tftpboot_render_bulk_vendors();
	tftpboot_load_tree();
	document.getElementById('tftpboot-open-btn').onclick = tftpboot_open_selected;
	document.getElementById('tftpboot-bulk-search').onclick = tftpboot_bulk_search;
	document.getElementById('tftpboot-directory-open').onclick = tftpboot_directory_show;
	document.getElementById('tftpboot-directory-refresh').onclick = function () { tftpboot_directory_show(true); };
	document.getElementById('tftpboot-sync-preview').onclick = tftpboot_sync_preview;
	document.getElementById('tftpboot-sync-apply').onclick = tftpboot_sync_apply;
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
		};
	});
}

function tftpboot_render_bulk_vendors() {
	var box = document.getElementById('tftpboot-bulk-vendors');
	if (!box) return;
	box.innerHTML = '';
	tftpboot_state.bulkVendors.forEach(function (v) {
		var lbl = document.createElement('label');
		lbl.innerHTML = '<input type="checkbox" class="tftpboot-bulk-vendor" value="' + escapeHtml(v) + '" checked /> ' + escapeHtml(v);
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
		card.innerHTML =
			'<span class="tftpboot-key-slot">#' + k.slot + '</span>' +
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
		keys.push({
			slot: parseInt(card.dataset.slot, 10),
			label: card.querySelector('.tftpboot-key-title').value,
			number: card.querySelector('.tftpboot-key-number').value
		});
	});
	var slot_order = [];
	document.querySelectorAll('#tftpboot-editor-keys .tftpboot-key-card').forEach(function (card) {
		slot_order.push(parseInt(card.dataset.slot, 10));
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

function tftpboot_bulk_search() {
	var q = document.getElementById('tftpboot-bulk-q').value;
	tftpboot_http('tftpboot_keys_search', { q: q, vendors: tftpboot_selected_vendors() }, function (res) {
		if (!res || res.code) return;
		tftpboot_state.bulkRows = res.rows || [];
		var tb = document.querySelector('#tftpboot-bulk-table tbody');
		tb.innerHTML = '';
		tftpboot_state.bulkRows.forEach(function (r, idx) {
			var tr = document.createElement('tr');
			tr.innerHTML =
				'<td>' + escapeHtml(r.label) + '</td>' +
				'<td>' + r.slot + '</td>' +
				'<td><input type="text" class="tftpboot-bulk-num" data-idx="' + idx + '" value="' + escapeHtml(r.number) + '" /></td>' +
				'<td><input type="text" class="tftpboot-bulk-title" data-idx="' + idx + '" value="' + escapeHtml(r.title) + '" /></td>' +
				'<td><button type="button" class="button-other tftpboot-bulk-one" data-idx="' + idx + '">' + LL('Save') + '</button></td>';
			tb.appendChild(tr);
		});
		document.querySelectorAll('.tftpboot-bulk-one').forEach(function (btn) {
			btn.onclick = function () { tftpboot_bulk_save_one(parseInt(btn.getAttribute('data-idx'), 10)); };
		});
	});
}

function tftpboot_bulk_save_one(idx) {
	var r = tftpboot_state.bulkRows[idx];
	if (!r) return;
	var numEl = document.querySelector('.tftpboot-bulk-num[data-idx="' + idx + '"]');
	var titEl = document.querySelector('.tftpboot-bulk-title[data-idx="' + idx + '"]');
	var item = {
		filename: r.filename,
		vendor: r.vendor,
		slot: r.slot,
		number: numEl ? numEl.value : r.number,
		title: titEl ? titEl.value : r.title
	};
	tftpboot_http('tftpboot_keys_bulk_save', { items: [item], vendors: tftpboot_selected_vendors() }, function (res) {
		f_notify(res && res.message ? res.message : 'OK', res && res.code ? 'error' : 'success');
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
