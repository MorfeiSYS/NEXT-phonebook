var tftpboot_state = {
	tree: [], policy: {}, syncDiff: [], bulkRows: [], bulkAllRows: [],
	bulkFilteredRows: [], bulkPage: 0, bulkPageSize: 50,
	bulkSortCol: '', bulkSortDir: 1,
	bulkFilterFixed: false, bulkFilterMissing: false,
	phonebookRows: null, bulkLookupMinDigits: 2, bulkLookupMinName: 2,
	bulkLookupMatchLimit: 20,
	directoryAllRows: [], directoryFilteredRows: [], directoryPage: 0,
	pickIndex: [], pickFilteredRows: [], pickMatchLimit: 50,
	moderationActionInFlight: false, moderationDetailSeq: 0,
	moderationHttpMs: 180000, labels: {},
	layoutVendors: [], layoutDraft: {}, layoutBlueprint: null, editorLayout: {}
};

function tftpboot_init(opts) {
	tftpboot_state.policy = opts.policy || { mode: 'buttons_only', sections: ['dss'] };
	tftpboot_state.isAdmin = !!opts.isAdmin;
	tftpboot_state.selfOnly = !!opts.selfOnly;
	tftpboot_state.canModerate = !!opts.canModerate;
	tftpboot_state.canUnfixBulk = !!opts.canUnfixBulk;
	tftpboot_state.moderationRequestId = 0;
	tftpboot_state.selfFiles = [];
	tftpboot_state.bulkVendors = opts.bulkVendors || [];
	tftpboot_state.bulkPageSize = parseInt(opts.bulkPageSize, 10) || 50;
	if (tftpboot_state.bulkPageSize < 5) tftpboot_state.bulkPageSize = 5;
	if (tftpboot_state.bulkPageSize > 500) tftpboot_state.bulkPageSize = 500;
	tftpboot_state.bulkLookupMinDigits = parseInt(opts.bulkLookupMinDigits, 10);
	if (isNaN(tftpboot_state.bulkLookupMinDigits) || tftpboot_state.bulkLookupMinDigits < 1) {
		tftpboot_state.bulkLookupMinDigits = 2;
	}
	if (tftpboot_state.bulkLookupMinDigits > 11) tftpboot_state.bulkLookupMinDigits = 11;
	tftpboot_state.bulkLookupMinName = parseInt(opts.bulkLookupMinName, 10);
	if (isNaN(tftpboot_state.bulkLookupMinName) || tftpboot_state.bulkLookupMinName < 1) {
		tftpboot_state.bulkLookupMinName = 2;
	}
	if (tftpboot_state.bulkLookupMinName > 30) tftpboot_state.bulkLookupMinName = 30;
	tftpboot_state.labels = opts.labels || {};
	tftpboot_state.syncApiFetch = !!opts.syncApiFetch;
	tftpboot_state.syncHasUndo = !!opts.syncHasUndo;
	tftpboot_state.syncWarmDone = false;
	tftpboot_state.syncWarmInFlight = false;
	tftpboot_state.syncPreviewInFlight = false;
	tftpboot_state.syncPreviewQueued = false;
	tftpboot_bind_tabs();
	if (tftpboot_state.selfOnly) {
		tftpboot_self_init();
	} else {
		tftpboot_render_bulk_vendors();
		tftpboot_render_sync_vendors();
		tftpboot_load_tree();
		var openBtn = document.getElementById('tftpboot-open-btn');
		if (openBtn) openBtn.onclick = tftpboot_open_selected;
		var pickQ = document.getElementById('tftpboot-pick-q');
		if (pickQ) {
			pickQ.oninput = tftpboot_pick_filter;
			pickQ.onkeydown = function (e) {
				if (e.key === 'Enter') {
					e.preventDefault();
					var rows = tftpboot_state.pickFilteredRows || [];
					if (rows.length) tftpboot_pick_open(rows[0].filename);
				}
			};
		}
	}
	var modOpen = document.getElementById('tftpboot-moderation-open');
	if (modOpen) modOpen.onclick = tftpboot_moderation_open_modal;
	var modBack = document.getElementById('tftpboot-moderation-back');
	if (modBack) modBack.onclick = tftpboot_moderation_show_list;
	var modApprove = document.getElementById('tftpboot-moderation-approve');
	if (modApprove) modApprove.onclick = tftpboot_moderation_approve;
	var modReject = document.getElementById('tftpboot-moderation-reject');
	if (modReject) modReject.onclick = tftpboot_moderation_reject;
	if (tftpboot_state.canModerate && typeof tftpboot_moderation_update_count === 'function') {
		tftpboot_moderation_update_count(parseInt(opts.moderationPendingCount, 10) || 0);
	}
	var bulkQ = document.getElementById('tftpboot-bulk-q');
	if (bulkQ) {
		bulkQ.oninput = tftpboot_bulk_filter;
		bulkQ.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); tftpboot_bulk_filter(); } };
	}
	tftpboot_bulk_bind_table_head();
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
	if (tftpboot_state.isAdmin) {
		var laySave = document.getElementById('tftpboot-layout-save');
		if (laySave) laySave.onclick = tftpboot_layout_save;
		var layVendor = document.getElementById('tftpboot-layout-vendor');
		if (layVendor) layVendor.onchange = tftpboot_layout_vendor_change;
		var layModel = document.getElementById('tftpboot-layout-model');
		if (layModel) layModel.onchange = tftpboot_layout_model_change;
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
			var tab = btn.getAttribute('data-tab');
			if (tab === 'bulk') {
				tftpboot_bulk_open_modal();
				return;
			}
			if (tab === 'layout') {
				tftpboot_layout_open_modal();
				return;
			}
			document.querySelectorAll('.tftpboot-tab').forEach(function (b) { b.classList.remove('active'); });
			btn.classList.add('active');
			document.querySelectorAll('.tftpboot-panel').forEach(function (p) { p.style.display = 'none'; });
			var panel = document.getElementById('tftpboot-panel-' + tab);
			if (panel) panel.style.display = 'block';
			if (tab === 'sync') tftpboot_sync_warm();
			if (tab === 'moderation') {
				var modBtn = document.getElementById('tftpboot-moderation-open');
				if (modBtn) modBtn.focus();
			}
		};
	});
}

function tftpboot_bulk_open_modal() {
	var m = document.getElementById('tftpboot-bulk-modal');
	if (!m) return;
	tftpboot_render_bulk_vendors();
	tftpboot_bulk_fetch();
	tftpboot_bulk_ensure_phonebook_cache();
	m.style.display = 'block';
	var q = document.getElementById('tftpboot-bulk-q');
	if (q) q.focus();
}

function tftpboot_bulk_close() {
	tftpboot_bulk_ac_close();
	var m = document.getElementById('tftpboot-bulk-modal');
	if (m) m.style.display = 'none';
}

function tftpboot_layout_label(key, fb) {
	if (tftpboot_state.labels && tftpboot_state.labels[key]) return tftpboot_state.labels[key];
	return fb;
}

function tftpboot_layout_default_rows(slots, cols) {
	var n = (slots || []).length;
	if (n < 1) return 1;
	cols = parseInt(cols, 10) || Math.min(5, n);
	if (cols < 1) cols = 1;
	return Math.ceil(n / cols);
}

function tftpboot_layout_effective_rows(slots, cols, rows) {
	var n = (slots || []).length;
	if (n < 1) return 1;
	cols = parseInt(cols, 10) || 1;
	if (cols < 1) cols = 1;
	var cap = Math.ceil(n / cols);
	rows = parseInt(rows, 10);
	if (!rows || rows < 1) rows = cap;
	if (rows > 64) rows = 64;
	return Math.min(rows, cap);
}

function tftpboot_layout_default_order_from_slots(slots, cols, rows) {
	slots = (slots || []).slice().sort(function (a, b) { return a - b; });
	var n = slots.length;
	if (n < 1) return [];
	cols = parseInt(cols, 10) || Math.min(5, n);
	if (cols < 1) cols = 1;
	if (cols > 12) cols = 12;
	var orderRows = tftpboot_layout_effective_rows(slots, cols, rows);
	var order = [];
	for (var r = 0; r < orderRows; r++) {
		for (var c = 0; c < cols; c++) {
			var idx = c * orderRows + r;
			if (idx < n) order.push(slots[idx]);
		}
	}
	return order;
}

function tftpboot_layout_spec_rows(slots, cols, prev) {
	var rows = tftpboot_layout_default_rows(slots, cols);
	if (prev && prev.rows) {
		var r = parseInt(prev.rows, 10);
		if (r >= 1 && r <= 64) rows = r;
	}
	return rows;
}

function tftpboot_layout_order_from_slots(slots, savedOrder, cols, rows) {
	slots = (slots || []).slice().sort(function (a, b) { return a - b; });
	if (!slots.length) return [];
	if (!savedOrder || !savedOrder.length) {
		return tftpboot_layout_default_order_from_slots(slots, cols, rows);
	}
	var allowed = {};
	slots.forEach(function (s) { allowed[s] = true; });
	var order = [];
	savedOrder.forEach(function (s) {
		s = parseInt(s, 10);
		if (allowed[s] && order.indexOf(s) < 0) order.push(s);
	});
	slots.forEach(function (s) {
		if (order.indexOf(s) < 0) order.push(s);
	});
	if (!order.length) {
		return tftpboot_layout_default_order_from_slots(slots, cols, rows);
	}
	return order;
}

function tftpboot_layout_open_modal() {
	var m = document.getElementById('tftpboot-layout-modal');
	if (!m) return;
	m.style.display = 'block';
	tftpboot_layout_init_panel();
}

function tftpboot_layout_close_modal() {
	var m = document.getElementById('tftpboot-layout-modal');
	if (m) m.style.display = 'none';
}

function tftpboot_layout_init_panel() {
	if (!tftpboot_state.layoutVendors.length) {
		tftpboot_http('tftpboot_layout_get', {}, function (res) {
			if (!res || res.code) {
				f_notify(res && res.message ? res.message : 'Error', 'error');
				return;
			}
			tftpboot_state.layoutVendors = res.vendors || [];
			tftpboot_layout_fill_vendor_select();
			tftpboot_layout_model_change();
		});
	} else {
		tftpboot_layout_model_change();
	}
}

function tftpboot_layout_fill_vendor_select() {
	var sel = document.getElementById('tftpboot-layout-vendor');
	if (!sel) return;
	sel.innerHTML = '';
	tftpboot_state.layoutVendors.forEach(function (v, i) {
		var opt = document.createElement('option');
		opt.value = v.id;
		opt.textContent = v.title || v.id;
		sel.appendChild(opt);
	});
	tftpboot_layout_vendor_change();
}

function tftpboot_layout_vendor_change() {
	var vsel = document.getElementById('tftpboot-layout-vendor');
	var msel = document.getElementById('tftpboot-layout-model');
	if (!vsel || !msel) return;
	var vid = vsel.value;
	msel.innerHTML = '';
	var vendor = null;
	tftpboot_state.layoutVendors.forEach(function (v) {
		if (v.id === vid) vendor = v;
	});
	if (!vendor || !vendor.models) return;
	vendor.models.forEach(function (m) {
		var opt = document.createElement('option');
		opt.value = m.id;
		opt.textContent = m.title || m.id;
		opt.dataset.slots = String(m.dss_slots || 16);
		msel.appendChild(opt);
	});
	tftpboot_layout_model_change();
}

function tftpboot_layout_current_model() {
	var vsel = document.getElementById('tftpboot-layout-vendor');
	var msel = document.getElementById('tftpboot-layout-model');
	if (!vsel || !msel) return null;
	var vid = vsel.value;
	var mid = msel.value;
	var vendor = null;
	tftpboot_state.layoutVendors.forEach(function (v) {
		if (v.id === vid) vendor = v;
	});
	if (!vendor) return null;
	var model = null;
	(vendor.models || []).forEach(function (m) {
		if (m.id === mid) model = m;
	});
	if (!model) return null;
	return { vendor: vendor, model: model };
}

function tftpboot_layout_model_change() {
	var ctx = tftpboot_layout_current_model();
	if (!ctx) return;
	var box = document.getElementById('tftpboot-layout-sections');
	if (box) box.innerHTML = '';
	tftpboot_http('tftpboot_layout_blueprint', { vendor: ctx.vendor.id, model: ctx.model.id }, function (res) {
		if (!res || res.code) {
			f_notify(res && res.message ? res.message : 'Error', 'error');
			return;
		}
		tftpboot_state.layoutBlueprint = res;
		var layout = ctx.model.layout && typeof ctx.model.layout === 'object' ? ctx.model.layout : {};
		tftpboot_state.layoutDraft = tftpboot_layout_build_draft(layout, res);
		tftpboot_layout_render_sections();
	});
}

function tftpboot_layout_build_draft(saved, blueprint) {
	var draft = { use_default: !!blueprint.use_default };
	var sections = blueprint.sections || [];
	if (blueprint.use_default && sections.length) {
		var sec = sections[0];
		var slots = sec.slots || [];
		var cols = Math.min(5, slots.length || 16);
		var prev = saved.default || (saved.sections && saved.sections.default) || {};
		if (prev.cols) cols = parseInt(prev.cols, 10) || cols;
		var rows = tftpboot_layout_spec_rows(slots, cols, prev);
		draft.default = {
			cols: cols,
			rows: rows,
			order: tftpboot_layout_order_from_slots(slots, prev.order, cols, rows)
		};
		return draft;
	}
	draft.sections = {};
	sections.forEach(function (sec) {
		var slots = sec.slots || [];
		var cols = Math.min(5, slots.length || 16);
		var prev = saved.sections && saved.sections[sec.id] ? saved.sections[sec.id] : {};
		if (prev.cols) cols = parseInt(prev.cols, 10) || cols;
		var rows = tftpboot_layout_spec_rows(slots, cols, prev);
		draft.sections[sec.id] = {
			cols: cols,
			rows: rows,
			order: tftpboot_layout_order_from_slots(slots, prev.order, cols, rows)
		};
	});
	return draft;
}

function tftpboot_layout_append_collapsible(root, title, contentEl, collapsed) {
	tftpboot_append_collapsible(root, title, contentEl, !!collapsed, 'tftpboot-layout-collapsible');
}

function tftpboot_layout_bind_digits_inp(inp, maxVal, onLive) {
	inp.type = 'text';
	inp.inputMode = 'numeric';
	inp.autocomplete = 'off';
	inp.maxLength = 3;
	inp.className += ' tftpboot-layout-size-inp';
	var apply = function () {
		var v = String(inp.value || '').replace(/\D/g, '').slice(0, 3);
		if (inp.value !== v) inp.value = v;
		if (v === '') return;
		var n = parseInt(v, 10);
		if (isNaN(n) || n < 1) return;
		if (n > maxVal) {
			n = maxVal;
			inp.value = String(n);
		}
		if (typeof onLive === 'function') onLive();
	};
	inp.addEventListener('input', apply);
	inp.addEventListener('change', function () {
		var n = parseInt(inp.value, 10);
		if (isNaN(n) || n < 1) n = 1;
		if (n > maxVal) n = maxVal;
		inp.value = String(n);
		if (typeof onLive === 'function') onLive();
	});
}

function tftpboot_layout_append_size_inputs(wrap, sec, spec) {
	var colsLbl = tftpboot_layout_label('layoutCols', 'Columns');
	var colsInp = document.createElement('input');
	colsInp.className = 'tftpboot-layout-cols form-field';
	colsInp.value = String(spec.cols || 5);
	colsInp.dataset.sectionId = sec.id;
	var liveSize = function () { tftpboot_layout_size_change(sec.id, wrap); };
	tftpboot_layout_bind_digits_inp(colsInp, 12, liveSize);
	var resetBtn = document.createElement('button');
	resetBtn.type = 'button';
	resetBtn.className = 'button-other tftpboot-layout-reset-btn';
	resetBtn.textContent = tftpboot_layout_label('layoutResetNumber', 'Reset numbering');
	resetBtn.title = resetBtn.textContent;
	resetBtn.onclick = function (e) {
		e.preventDefault();
		tftpboot_layout_reset_numbering(sec.id, wrap);
	};
	wrap.appendChild(document.createTextNode(colsLbl + ' '));
	wrap.appendChild(colsInp);
	wrap.appendChild(document.createTextNode(' '));
	wrap.appendChild(resetBtn);
	if (sec.slots && sec.slots.length) {
		wrap.dataset.layoutSlots = sec.slots.join(',');
	}
	return { colsInp: colsInp, resetBtn: resetBtn };
}

function tftpboot_layout_slots_from_wrap(wrap) {
	var slots = [];
	if (wrap && wrap.dataset.layoutSlots) {
		wrap.dataset.layoutSlots.split(',').forEach(function (s) {
			s = parseInt(s, 10);
			if (!isNaN(s) && s > 0) slots.push(s);
		});
	}
	if (!slots.length && wrap) {
		var grid = wrap.querySelector('.tftpboot-layout-grid');
		if (grid) {
			Array.prototype.forEach.call(grid.children, function (card) {
				var s = parseInt(card.dataset.slot, 10);
				if (!isNaN(s)) slots.push(s);
			});
		}
	}
	slots.sort(function (a, b) { return a - b; });
	return slots;
}

function tftpboot_layout_reset_numbering(sid, wrap) {
	if (!wrap) return;
	var colsInp = wrap.querySelector('.tftpboot-layout-cols');
	var cols = colsInp ? parseInt(colsInp.value, 10) || 0 : 0;
	if (cols < 1) cols = 1;
	if (cols > 12) cols = 12;
	if (colsInp) colsInp.value = String(cols);
	var grid = wrap.querySelector('.tftpboot-layout-grid');
	if (!grid) return;
	var slots = tftpboot_layout_slots_from_wrap(wrap);
	if (!slots.length) return;
	var rows = tftpboot_layout_default_rows(slots, cols);
	var order = tftpboot_layout_default_order_from_slots(slots, cols, rows);
	tftpboot_apply_keys_grid_layout(grid, { cols: cols, rows: rows, order: order });
	if (sid === 'default') {
		if (!tftpboot_state.layoutDraft.default) tftpboot_state.layoutDraft.default = {};
		tftpboot_state.layoutDraft.default.cols = cols;
		tftpboot_state.layoutDraft.default.rows = rows;
		tftpboot_state.layoutDraft.default.order = order;
	} else {
		if (!tftpboot_state.layoutDraft.sections) tftpboot_state.layoutDraft.sections = {};
		if (!tftpboot_state.layoutDraft.sections[sid]) tftpboot_state.layoutDraft.sections[sid] = {};
		tftpboot_state.layoutDraft.sections[sid].cols = cols;
		tftpboot_state.layoutDraft.sections[sid].rows = rows;
		tftpboot_state.layoutDraft.sections[sid].order = order;
	}
}

function tftpboot_layout_section_tab_title(sec, dssList) {
	var base = tftpboot_editor_label('dsskey');
	if (sec.title && /config\s*\d+/i.test(sec.title)) {
		var m = sec.title.match(/config\s*(\d+)/i);
		if (m) return base + ' ' + m[1];
	}
	var idx = dssList.indexOf(sec);
	return base + ' ' + (idx >= 0 ? idx + 1 : 1);
}

function tftpboot_layout_render_section_block(parent, sec, spec, showTitle) {
	var wrap = document.createElement('div');
	wrap.className = 'tftpboot-layout-section-block';
	wrap.dataset.sectionId = sec.id;
	if (showTitle !== false) {
		var title = sec.id === 'default'
			? tftpboot_layout_label('layoutDefault', 'Default grid')
			: (sec.title || sec.id);
		var head = document.createElement('h4');
		head.textContent = title;
		wrap.appendChild(head);
	}
	tftpboot_layout_append_size_inputs(wrap, sec, spec);
	var grid = document.createElement('div');
	grid.className = 'tftpboot-keys-grid tftpboot-layout-grid tftpboot-keys-grid--layout';
	grid.dataset.sectionId = sec.id;
	var cols = parseInt(spec.cols, 10) || 5;
	var rows = parseInt(spec.rows, 10);
	if (!rows || rows < 1) rows = tftpboot_layout_default_rows(sec.slots || [], cols);
	var order = spec.order && spec.order.length ? spec.order.slice()
		: tftpboot_layout_default_order_from_slots(sec.slots || [], cols, rows);
	order.forEach(function (slot) {
		grid.appendChild(tftpboot_layout_create_cell(slot, grid));
	});
	tftpboot_apply_keys_grid_layout(grid, { cols: cols, rows: rows, order: order });
	wrap.appendChild(grid);
	parent.appendChild(wrap);
	return wrap;
}

function tftpboot_layout_render_sections() {
	var box = document.getElementById('tftpboot-layout-sections');
	if (!box) return;
	box.innerHTML = '';
	var blueprint = tftpboot_state.layoutBlueprint;
	var draft = tftpboot_state.layoutDraft || {};
	if (!blueprint || !blueprint.sections) return;
	var sections = blueprint.sections;
	if (blueprint.use_default && sections.length) {
		var spec = draft.default || { cols: 5, order: [] };
		tftpboot_layout_render_section_block(box, sections[0], spec);
		return;
	}
	var sidekey = [];
	var softdss = [];
	var dss = [];
	var other = [];
	sections.forEach(function (sec) {
		if (sec.kind === 'sidekey') sidekey.push(sec);
		else if (sec.kind === 'softdss') softdss.push(sec);
		else if (sec.kind === 'dsskey_page') dss.push(sec);
		else other.push(sec);
	});
	sidekey.forEach(function (sec) {
		var spec = draft.sections && draft.sections[sec.id] ? draft.sections[sec.id] : { cols: 5, order: [] };
		var inner = document.createElement('div');
		tftpboot_layout_render_section_block(inner, sec, spec, false);
		tftpboot_layout_append_collapsible(box, tftpboot_editor_label('sidekey'), inner, true);
	});
	if (dss.length) {
		var dssWrap = document.createElement('div');
		var inner = document.createElement('div');
		inner.className = 'tftpboot-dsskey-tabbed tftpboot-layout-dsskey-tabbed';
		var panels = document.createElement('div');
		panels.className = 'tftpboot-dsskey-panels';
		var tabs = document.createElement('div');
		tabs.className = 'tftpboot-dsskey-tabs';
		dss.forEach(function (sec, idx) {
			var spec = draft.sections && draft.sections[sec.id] ? draft.sections[sec.id] : { cols: 5, order: [] };
			var panel = document.createElement('div');
			panel.className = 'tftpboot-layout-dsskey-panel';
			panel.dataset.panel = String(idx);
			if (idx > 0) panel.style.display = 'none';
			tftpboot_layout_render_section_block(panel, sec, spec, false);
			var pageLbl = tftpboot_layout_section_tab_title(sec, dss);
			var block = panel.querySelector('.tftpboot-layout-section-block');
			if (block) {
				var sub = document.createElement('h5');
				sub.className = 'tftpboot-layout-dsskey-page-title';
				sub.textContent = pageLbl;
				panel.insertBefore(sub, block);
			}
			panels.appendChild(panel);
			var btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'tftpboot-dsskey-tab' + (idx === 0 ? ' active' : '');
			btn.textContent = pageLbl;
			btn.dataset.panel = String(idx);
			btn.onclick = function () {
				tabs.querySelectorAll('.tftpboot-dsskey-tab').forEach(function (b) { b.classList.remove('active'); });
				btn.classList.add('active');
				panels.querySelectorAll('.tftpboot-layout-dsskey-panel').forEach(function (p) {
					p.style.display = p.dataset.panel === btn.dataset.panel ? '' : 'none';
				});
			};
			tabs.appendChild(btn);
		});
		inner.appendChild(panels);
		inner.appendChild(tabs);
		dssWrap.appendChild(inner);
		tftpboot_layout_append_collapsible(box, tftpboot_editor_label('dsskey'), dssWrap, false);
	}
	softdss.forEach(function (sec) {
		var spec = draft.sections && draft.sections[sec.id] ? draft.sections[sec.id] : { cols: 5, order: [] };
		var inner = document.createElement('div');
		tftpboot_layout_render_section_block(inner, sec, spec, false);
		tftpboot_layout_append_collapsible(box, tftpboot_editor_label('softdss'), inner, true);
	});
	other.forEach(function (sec) {
		var spec = draft.sections && draft.sections[sec.id] ? draft.sections[sec.id] : { cols: 5, order: [] };
		tftpboot_layout_render_section_block(box, sec, spec);
	});
}

function tftpboot_layout_size_change(sid, wrap) {
	if (!wrap) return;
	var colsInp = wrap.querySelector('.tftpboot-layout-cols');
	var cols = colsInp ? parseInt(colsInp.value, 10) || 1 : 1;
	if (cols < 1) cols = 1;
	if (cols > 12) cols = 12;
	if (colsInp) colsInp.value = String(cols);
	var slots = tftpboot_layout_slots_from_wrap(wrap);
	var rows = tftpboot_layout_default_rows(slots, cols);
	if (sid === 'default') {
		if (!tftpboot_state.layoutDraft.default) tftpboot_state.layoutDraft.default = {};
		tftpboot_state.layoutDraft.default.cols = cols;
		tftpboot_state.layoutDraft.default.rows = rows;
	} else {
		if (!tftpboot_state.layoutDraft.sections) tftpboot_state.layoutDraft.sections = {};
		if (!tftpboot_state.layoutDraft.sections[sid]) tftpboot_state.layoutDraft.sections[sid] = {};
		tftpboot_state.layoutDraft.sections[sid].cols = cols;
		tftpboot_state.layoutDraft.sections[sid].rows = rows;
	}
	var grid = wrap.querySelector('.tftpboot-layout-grid');
	if (grid) {
		var order = tftpboot_layout_grid_order(grid);
		tftpboot_apply_keys_grid_layout(grid, { cols: cols, rows: rows, order: order });
	}
}

function tftpboot_layout_create_cell(slot, grid) {
	var card = document.createElement('div');
	card.className = 'tftpboot-key-card tftpboot-layout-cell';
	card.draggable = true;
	card.dataset.slot = String(slot);
	var cellLbl = tftpboot_layout_label('keyCell', 'Cell');
	card.innerHTML = '<span class="tftpboot-key-slot"><span class="tftpboot-key-slot-label">'
		+ escapeHtml(cellLbl) + ' #' + slot + '</span></span>';
	tftpboot_bind_layout_dnd(card, grid);
	return card;
}

function tftpboot_layout_clear_drop_hints(grid) {
	if (!grid) return;
	Array.prototype.forEach.call(grid.children, function (el) {
		el.classList.remove('tftpboot-layout-drop-hint');
	});
}

function tftpboot_bind_layout_dnd(card, grid) {
	card.addEventListener('dragstart', function (e) {
		grid._tftpbootDragCard = card;
		e.dataTransfer.setData('text/plain', card.dataset.slot);
		e.dataTransfer.effectAllowed = 'move';
		card.classList.add('tftpboot-dragging');
	});
	card.addEventListener('dragend', function () {
		card.classList.remove('tftpboot-dragging');
		tftpboot_layout_clear_drop_hints(grid);
		grid._tftpbootDragCard = null;
		tftpboot_layout_sync_grid_order(grid);
	});
	card.addEventListener('dragover', function (e) {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		var from = grid._tftpbootDragCard;
		if (!from || from === card) return;
		tftpboot_layout_clear_drop_hints(grid);
		card.classList.add('tftpboot-layout-drop-hint');
	});
	card.addEventListener('dragleave', function (e) {
		if (!e.relatedTarget || !card.contains(e.relatedTarget)) {
			card.classList.remove('tftpboot-layout-drop-hint');
		}
	});
	card.addEventListener('drop', function (e) {
		e.preventDefault();
		var from = grid._tftpbootDragCard;
		if (!from || from === card) return;
		var parent = grid;
		var after = (from.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING) ? card.nextSibling : card;
		parent.insertBefore(from, after);
		tftpboot_layout_clear_drop_hints(grid);
		tftpboot_layout_sync_grid_order(grid);
	});
}

function tftpboot_layout_grid_order(grid) {
	var order = [];
	Array.prototype.forEach.call(grid.children, function (card) {
		var s = parseInt(card.dataset.slot, 10);
		if (!isNaN(s)) order.push(s);
	});
	return order;
}

function tftpboot_layout_sync_grid_order(grid) {
	var sid = grid.dataset.sectionId;
	if (!sid || !tftpboot_state.layoutDraft) return;
	var order = tftpboot_layout_grid_order(grid);
	var block = grid.closest('.tftpboot-layout-section-block');
	var colsInp = block ? block.querySelector('.tftpboot-layout-cols') : null;
	var cols = colsInp ? parseInt(colsInp.value, 10) || 5 : 5;
	var slots = block ? tftpboot_layout_slots_from_wrap(block) : [];
	var rowSpec = sid === 'default'
		? (tftpboot_state.layoutDraft.default || {})
		: ((tftpboot_state.layoutDraft.sections && tftpboot_state.layoutDraft.sections[sid]) || {});
	var rows = tftpboot_layout_spec_rows(slots, cols, rowSpec);
	if (sid === 'default') {
		if (!tftpboot_state.layoutDraft.default) tftpboot_state.layoutDraft.default = {};
		tftpboot_state.layoutDraft.default.order = order;
		tftpboot_state.layoutDraft.default.cols = cols;
		tftpboot_state.layoutDraft.default.rows = rows;
	} else {
		if (!tftpboot_state.layoutDraft.sections) tftpboot_state.layoutDraft.sections = {};
		if (!tftpboot_state.layoutDraft.sections[sid]) tftpboot_state.layoutDraft.sections[sid] = {};
		tftpboot_state.layoutDraft.sections[sid].order = order;
		tftpboot_state.layoutDraft.sections[sid].cols = cols;
		tftpboot_state.layoutDraft.sections[sid].rows = rows;
	}
}

function tftpboot_layout_save() {
	var ctx = tftpboot_layout_current_model();
	if (!ctx) return;
	document.querySelectorAll('.tftpboot-layout-grid').forEach(function (grid) {
		tftpboot_layout_sync_grid_order(grid);
	});
	var payload = { use_default: tftpboot_state.layoutDraft.use_default };
	if (payload.use_default) {
		payload.default = tftpboot_state.layoutDraft.default;
	} else {
		payload.sections = tftpboot_state.layoutDraft.sections;
	}
	tftpboot_http('tftpboot_layout_save', {
		vendor: ctx.vendor.id,
		model: ctx.model.id,
		layout: payload
	}, function (res) {
		f_notify(res && res.message ? res.message : 'OK', res && res.code ? 'error' : 'success');
		if (res && !res.code) {
			ctx.model.layout = JSON.parse(JSON.stringify(tftpboot_state.layoutDraft));
		}
	});
}

function tftpboot_star_dial_prefix(s) {
	return /^\*/.test(String(s || '').trim());
}

function tftpboot_normalize_star_dial(star) {
	star = String(star || '').replace(/[^\d*]/g, '');
	if (!star.length || star[0] !== '*') return '';
	if (star.length >= 2 && star[1] === '*') return '**';
	if (star.length >= 2) {
		if (star[1] === '8') return star.length > 2 ? '*8' : star.slice(0, 2);
		return '*';
	}
	return star;
}

function tftpboot_is_valid_star_dial(s) {
	var t = String(s || '').trim();
	return t === '**' || t === '*8';
}

function tftpboot_is_star_transfer_dial(s) {
	return tftpboot_is_valid_star_dial(s);
}

function tftpboot_split_star_dial_value(raw) {
	var s = String(raw || '').trim();
	var m = s.match(/^(\*\*|\*8)(@1\/[a-z]+)?$/i);
	if (!m) return null;
	return { number: m[1], suffix: m[2] || '' };
}

function tftpboot_dial_err(key) {
	var lbl = tftpboot_state.labels || {};
	if (lbl[key]) return lbl[key];
	if (typeof LL === 'object' && LL) {
		if (key === 'starDialInvalid' && LL.TftpBootStarDialInvalid) return LL.TftpBootStarDialInvalid;
		if (key === 'dialLabelRequired' && LL.TftpBootDialLabelRequired) return LL.TftpBootDialLabelRequired;
		if (key === 'dialNumberRequired' && LL.TftpBootDialNumberRequired) return LL.TftpBootDialNumberRequired;
	}
	if (key === 'starDialInvalid') return 'Only *8 or ** allowed';
	if (key === 'dialLabelRequired') return 'Label required when number is set';
	return 'Number required when label is set';
}

function tftpboot_validate_dial_pair_detail(label, number, spec) {
	if (spec) return null;
	var lab = String(label || '').trim();
	var num = String(number || '').trim();
	if (!lab && !num) return null;
	if (lab && !num) return { code: 'dialNumberRequired', message: tftpboot_dial_err('dialNumberRequired') };
	if (num && !lab) return { code: 'dialLabelRequired', message: tftpboot_dial_err('dialLabelRequired') };
	if (tftpboot_star_dial_prefix(num) && !tftpboot_is_valid_star_dial(num)) {
		return { code: 'starDialInvalid', message: tftpboot_dial_err('starDialInvalid') };
	}
	return null;
}

function tftpboot_validate_dial_pair(label, number, spec) {
	var d = tftpboot_validate_dial_pair_detail(label, number, spec);
	return d ? d.message : '';
}

function tftpboot_clear_dial_field_errors(root) {
	var scope = root || document;
	scope.querySelectorAll('.tftpboot-field-error').forEach(function (el) {
		el.classList.remove('tftpboot-field-error');
	});
}

function tftpboot_mark_dial_field_error(el) {
	if (!el) return;
	el.classList.add('tftpboot-field-error');
	if (typeof el.scrollIntoView === 'function') {
		el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}
	if (typeof el.focus === 'function') {
		try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
	}
}

function tftpboot_dial_error_input(card, code, bulkIdx) {
	var useBulk = bulkIdx != null && bulkIdx !== '';
	if (code === 'dialLabelRequired') {
		if (useBulk) return document.querySelector('.tftpboot-bulk-title[data-idx="' + bulkIdx + '"]');
		return card ? card.querySelector('.tftpboot-key-title') : null;
	}
	if (useBulk) return document.querySelector('.tftpboot-bulk-num[data-idx="' + bulkIdx + '"]');
	return card ? card.querySelector('.tftpboot-key-number') : null;
}

function tftpboot_show_dial_pair_error(card, code, message, bulkIdx) {
	tftpboot_clear_dial_field_errors(
		bulkIdx != null && bulkIdx !== ''
			? document.getElementById('tftpboot-bulk-table')
			: document.getElementById('tftpboot-editor')
	);
	tftpboot_mark_dial_field_error(tftpboot_dial_error_input(card, code, bulkIdx));
	f_notify(message, 'error');
}

function tftpboot_sanitize_dial_number(raw) {
	var s = String(raw || '').trim();
	if (tftpboot_special_line_value(s)) return s;
	var full = tftpboot_split_star_dial_value(s);
	if (full) return full.number;
	if (tftpboot_star_dial_prefix(s)) {
		return tftpboot_normalize_star_dial(s);
	}
	var d = s.replace(/\D/g, '');
	if (d.length > 11) d = d.slice(0, 11);
	return d;
}

function tftpboot_bind_dial_number_input(el) {
	if (!el || el.disabled || el.readOnly) return;
	el.setAttribute('maxlength', '12');
	el.removeAttribute('inputmode');
	el.removeAttribute('pattern');
	var run = function () {
		if (tftpboot_special_line_value(el.value)) return;
		var v = tftpboot_sanitize_dial_number(el.value);
		if (el.value !== v) el.value = v;
	};
	el.addEventListener('input', run);
	el.addEventListener('paste', function () { setTimeout(run, 0); });
	el.addEventListener('input', function () { el.classList.remove('tftpboot-field-error'); });
}

function tftpboot_card_star_transfer(card) {
	if (card.dataset.starTransfer === '1') return true;
	var numEl = card.querySelector('.tftpboot-key-number');
	if (!numEl) return false;
	return tftpboot_is_star_transfer_dial(numEl.value);
}

var g_tftpboot_self_poll_timer = null;

function tftpboot_self_poll_interval_sec() {
	var sec = parseInt(window.g_tftpboot_moderation_poll_sec, 10);
	if (isNaN(sec) || sec < 60) sec = 60;
	return sec;
}

function tftpboot_self_reload_files(notifyOnError) {
	var sel = document.getElementById('tftpboot-self-file');
	var prev = sel ? sel.value : '';
	tftpboot_http('tftpboot_self_files', {}, function (res) {
		if (!res || res.code) {
			if (notifyOnError) f_notify(res && res.message ? res.message : 'Error', 'error');
			return;
		}
		tftpboot_state.selfFiles = res.files || [];
		if (!sel) return;
		var had = false;
		sel.innerHTML = '';
		tftpboot_state.selfFiles.forEach(function (f) {
			var o = document.createElement('option');
			o.value = f.filename;
			o.textContent = f.label || f.filename;
			if (prev && f.filename === prev) {
				o.selected = true;
				had = true;
			}
			sel.appendChild(o);
		});
		if (!had && sel.options.length) sel.selectedIndex = 0;
		tftpboot_self_update_status();
	});
}

function tftpboot_self_poll_tick() {
	if (!tftpboot_state.selfOnly) return;
	if (typeof document.hidden !== 'undefined' && document.hidden) return;
	var editor = document.getElementById('tftpboot-editor');
	if (editor && editor.style.display !== 'none' && editor.style.display !== '') return;
	tftpboot_self_reload_files(false);
}

function tftpboot_self_poll_start() {
	if (!tftpboot_state.selfOnly) return;
	tftpboot_self_poll_stop();
	var sec = tftpboot_self_poll_interval_sec();
	g_tftpboot_self_poll_timer = setInterval(tftpboot_self_poll_tick, sec * 1000);
}

function tftpboot_self_poll_stop() {
	if (g_tftpboot_self_poll_timer) {
		clearInterval(g_tftpboot_self_poll_timer);
		g_tftpboot_self_poll_timer = null;
	}
}

function tftpboot_self_init() {
	var openBtn = document.getElementById('tftpboot-self-open-btn');
	if (openBtn) openBtn.onclick = tftpboot_self_open_selected;
	var sel = document.getElementById('tftpboot-self-file');
	if (sel) sel.onchange = tftpboot_self_update_status;
	tftpboot_self_reload_files(true);
	tftpboot_self_poll_start();
}

function tftpboot_self_update_status() {
	var sel = document.getElementById('tftpboot-self-file');
	var box = document.getElementById('tftpboot-self-status');
	if (!sel || !box) return;
	var fn = sel.value;
	var row = null;
	tftpboot_state.selfFiles.forEach(function (f) {
		if (f.filename === fn) row = f;
	});
	tftpboot_self_sync_open_btn(row);
	if (!row || !row.moderation) {
		if (box) {
			box.style.display = 'none';
			box.textContent = '';
		}
		return;
	}
	var st = row.moderation.status;
	var lbl = tftpboot_state.labels || {};
	if (st === 'pending') {
		box.className = 'tftpboot-self-status tftpboot-self-status-pending';
		box.textContent = lbl.selfStatusPending || 'Pending moderation';
		box.style.display = '';
	} else if (st === 'rejected') {
		box.className = 'tftpboot-self-status';
		var title = lbl.selfStatusRejected || 'Rejected';
		var rejectNote = row.moderation.reject_note ? String(row.moderation.reject_note) : '';
		if (rejectNote) {
			box.innerHTML = escapeHtml(title) + ': <span class="tftpboot-self-status-reject-note">'
				+ escapeHtml(rejectNote) + '</span>';
		} else {
			box.textContent = title;
		}
		box.style.display = '';
	} else {
		box.className = 'tftpboot-self-status';
		box.style.display = 'none';
	}
}

function tftpboot_set_pb_hint(el, text) {
	if (!el) return;
	el.removeAttribute('title');
	if (el.getAttribute('data-pb-hint-bound') === '1') {
		if (text) {
			el.classList.add('pb-hint');
			el.setAttribute('data-pb-hint', text);
		} else {
			el.classList.remove('pb-hint', 'pb-hint-source');
			el.removeAttribute('data-pb-hint');
			el.removeAttribute('data-pb-hint-bound');
		}
		return;
	}
	if (text) {
		el.classList.add('pb-hint');
		el.setAttribute('data-pb-hint', text);
		if (typeof pb_hint_bind === 'function') {
			pb_hint_bind(el);
		}
	} else {
		el.classList.remove('pb-hint', 'pb-hint-source');
		el.removeAttribute('data-pb-hint');
	}
}

function tftpboot_self_pending_hint() {
	var lbl = tftpboot_state.labels || {};
	if (lbl.selfModerationPendingBlock) return lbl.selfModerationPendingBlock;
	if (typeof LL === 'object' && LL && LL.TftpBootModerationPendingBlock) return LL.TftpBootModerationPendingBlock;
	return 'Editing is unavailable until the operator processes your request';
}

function tftpboot_self_sync_open_btn(row) {
	var openBtn = document.getElementById('tftpboot-self-open-btn');
	if (!openBtn) return;
	var blocked = row && row.can_edit === false;
	openBtn.disabled = false;
	if (blocked) {
		openBtn.classList.add('tftpboot-self-open-wait');
		tftpboot_set_pb_hint(openBtn, tftpboot_self_pending_hint());
		openBtn.setAttribute('aria-disabled', 'true');
	} else {
		openBtn.classList.remove('tftpboot-self-open-wait');
		tftpboot_set_pb_hint(openBtn, null);
		openBtn.removeAttribute('aria-disabled');
	}
}

function tftpboot_self_open_selected() {
	var sel = document.getElementById('tftpboot-self-file');
	if (!sel || !sel.value) return;
	var row = null;
	tftpboot_state.selfFiles.forEach(function (f) {
		if (f.filename === sel.value) row = f;
	});
	if (row && row.can_edit === false) {
		f_notify(tftpboot_self_pending_hint(), 'error');
		return;
	}
	tftpboot_open_editor(sel.value);
}

function tftpboot_moderation_close() {
	var m = document.getElementById('tftpboot-moderation-modal');
	if (m) m.style.display = 'none';
	tftpboot_state.moderationRequestId = 0;
}

function tftpboot_moderation_open_modal() {
	var m = document.getElementById('tftpboot-moderation-modal');
	if (!m) return;
	m.style.display = 'block';
	tftpboot_moderation_show_list();
	tftpboot_moderation_load_list();
}

function tftpboot_moderation_show_list() {
	var list = document.getElementById('tftpboot-moderation-list-view');
	var detail = document.getElementById('tftpboot-moderation-detail-view');
	if (list) list.style.display = '';
	if (detail) detail.style.display = 'none';
	tftpboot_state.moderationRequestId = 0;
	tftpboot_state.moderationDetailSeq = (tftpboot_state.moderationDetailSeq || 0) + 1;
	tftpboot_moderation_set_busy(false);
	var note = document.getElementById('tftpboot-moderation-reject-note');
	if (note) note.value = '';
}

function tftpboot_moderation_load_list() {
	var box = document.getElementById('tftpboot-moderation-list');
	if (!box) return;
	box.innerHTML = '<p>' + escapeHtml((tftpboot_state.labels && tftpboot_state.labels.moderationLoading) || '…') + '</p>';
	tftpboot_http('tftpboot_moderation_list', {}, function (res) {
		if (!res || res.code) {
			box.innerHTML = '<p>' + escapeHtml(res && res.message ? res.message : 'Error') + '</p>';
			return;
		}
		var items = res.items || [];
		var empty = (tftpboot_state.labels && tftpboot_state.labels.moderationEmpty) || 'No pending requests';
		if (!items.length) {
			box.innerHTML = '<p>' + escapeHtml(empty) + '</p>';
			if (typeof res.pending_count === 'number' && typeof tftpboot_moderation_update_count === 'function') {
				tftpboot_moderation_update_count(res.pending_count);
			}
			return;
		}
		var html = '<table class="tftpboot-table"><thead><tr><th>' +
			escapeHtml(tftpboot_state.labels.keyNumber || 'Phone') + '</th><th>' +
			escapeHtml(tftpboot_state.labels.keyTitle || 'User') + '</th><th></th></tr></thead><tbody>';
		items.forEach(function (it) {
			html += '<tr><td>' + escapeHtml(it.phone_label || '') + '</td><td>' +
				escapeHtml(it.display_name || it.submitter_login || '') + '</td><td>' +
				'<button type="button" class="button-other tftpboot-mod-review" data-id="' + it.id + '">' +
				escapeHtml((tftpboot_state.labels && tftpboot_state.labels.moderationReview) || 'Review') +
				'</button></td></tr>';
		});
		html += '</tbody></table>';
		box.innerHTML = html;
		if (typeof res.pending_count === 'number' && typeof tftpboot_moderation_update_count === 'function') {
			tftpboot_moderation_update_count(res.pending_count);
		}
		box.querySelectorAll('.tftpboot-mod-review').forEach(function (btn) {
			btn.onclick = function () {
				tftpboot_moderation_open_detail(parseInt(btn.getAttribute('data-id'), 10));
			};
		});
	});
}

function tftpboot_moderation_open_detail(id) {
	if (!id) return;
	var list = document.getElementById('tftpboot-moderation-list-view');
	var detail = document.getElementById('tftpboot-moderation-detail-view');
	if (list) list.style.display = 'none';
	if (detail) detail.style.display = '';
	tftpboot_state.moderationRequestId = 0;
	tftpboot_state.moderationDetailSeq = (tftpboot_state.moderationDetailSeq || 0) + 1;
	var detailSeq = tftpboot_state.moderationDetailSeq;
	var meta = document.getElementById('tftpboot-moderation-detail-meta');
	var diffBox = document.getElementById('tftpboot-moderation-diff');
	if (meta) meta.textContent = '';
	if (diffBox) diffBox.innerHTML = '<p>' + escapeHtml((tftpboot_state.labels && tftpboot_state.labels.moderationLoading) || '…') + '</p>';
	tftpboot_moderation_set_busy(true);
	tftpboot_http_moderation('tftpboot_moderation_get', { id: id }, function (res) {
		if (detailSeq !== tftpboot_state.moderationDetailSeq) return;
		tftpboot_moderation_set_busy(false);
		if (!res || res.code || !res.request) {
			f_notify(res && res.message ? res.message : 'Error', 'error');
			tftpboot_moderation_show_list();
			return;
		}
		var r = res.request;
		tftpboot_state.moderationRequestId = id;
		if (meta) {
			meta.textContent = (r.phone_label || '') + ' — ' + (r.display_name || r.submitter_login || '') + ' (' + (r.created || '') + ')';
		}
		tftpboot_moderation_render_diff(r.diff || []);
	});
}

function tftpboot_moderation_render_diff(diff) {
	var box = document.getElementById('tftpboot-moderation-diff');
	if (!box) return;
	var lbl = tftpboot_state.labels || {};
	var keyH = lbl.moderationDiffKey || 'Key';
	var wasH = lbl.moderationDiffWas || 'Was';
	var nowH = lbl.moderationDiffNow || 'Now';
	if (!diff.length) {
		box.innerHTML = '<p>' + escapeHtml(lbl.moderationNoDiff || 'No button changes') + '</p>';
		return;
	}
	var html = '<table class="tftpboot-table"><thead><tr><th>' + escapeHtml(keyH) +
		'</th><th>' + escapeHtml(lbl.keyTitle || 'Label') + '</th><th>' + escapeHtml(lbl.keyNumber || 'Number') + '</th></tr></thead><tbody>';
	diff.forEach(function (d) {
		var key = d.key_id || '—';
		var lab = escapeHtml(d.label_was || '—') + ' → ' + escapeHtml(d.label_now || '—');
		var num = escapeHtml(d.number_was || '—') + ' → ' + escapeHtml(d.number_now || '—');
		html += '<tr><td>' + escapeHtml(key) + '</td><td>' + lab + '</td><td>' + num + '</td></tr>';
	});
	html += '</tbody></table>';
	box.innerHTML = html;
}

function tftpboot_moderation_approve() {
	var id = tftpboot_state.moderationRequestId;
	if (!id || tftpboot_state.moderationActionInFlight) return;
	tftpboot_moderation_set_busy(true);
	tftpboot_http_moderation('tftpboot_moderation_approve', { id: id }, function (res) {
		tftpboot_moderation_set_busy(false);
		f_notify(res && res.message ? res.message : 'OK', res && res.code ? 'error' : 'success');
		if (res && !res.code) {
			tftpboot_moderation_close();
			if (typeof res.pending_count === 'number' && typeof tftpboot_moderation_update_count === 'function') {
				tftpboot_moderation_update_count(res.pending_count);
			}
		}
	});
}

function tftpboot_reject_note_err(key) {
	var lbl = tftpboot_state.labels || {};
	if (lbl[key]) return lbl[key];
	if (typeof LL === 'object' && LL) {
		if (key === 'rejectNoteRequired' && LL.TftpBootModerationRejectNoteRequired) {
			return LL.TftpBootModerationRejectNoteRequired;
		}
		if (key === 'rejectNoteInvalid' && LL.TftpBootModerationRejectNoteInvalid) {
			return LL.TftpBootModerationRejectNoteInvalid;
		}
	}
	if (key === 'rejectNoteRequired') return 'Rejection comment is required';
	return 'Invalid rejection comment';
}

function tftpboot_validate_reject_note_client(note) {
	note = String(note || '').trim();
	if (!note) return tftpboot_reject_note_err('rejectNoteRequired');
	if (note.length > 300) return tftpboot_reject_note_err('rejectNoteInvalid');
	if (/<\s*\/?\s*script/i.test(note) || /<\s*\/?\s*iframe/i.test(note) || /<\s*\/?\s*style/i.test(note)) {
		return tftpboot_reject_note_err('rejectNoteInvalid');
	}
	if (/[<>&]/.test(note) || /&(?:#\d+|#x[0-9a-f]+|[a-z]+);/i.test(note)) {
		return tftpboot_reject_note_err('rejectNoteInvalid');
	}
	if (/javascript\s*:/i.test(note) || /data\s*:/i.test(note)) {
		return tftpboot_reject_note_err('rejectNoteInvalid');
	}
	if (!/^[\p{L}\p{N}\s,.\-+\/\\_@#!*()№\n\r\t]+$/u.test(note)) {
		return tftpboot_reject_note_err('rejectNoteInvalid');
	}
	return '';
}

function tftpboot_moderation_reject() {
	var id = tftpboot_state.moderationRequestId;
	if (!id || tftpboot_state.moderationActionInFlight) return;
	var noteEl = document.getElementById('tftpboot-moderation-reject-note');
	var note = noteEl ? noteEl.value : '';
	var err = tftpboot_validate_reject_note_client(note);
	if (err) {
		tftpboot_clear_dial_field_errors(document.getElementById('tftpboot-moderation-detail-view'));
		tftpboot_mark_dial_field_error(noteEl);
		f_notify(err, 'error');
		return;
	}
	tftpboot_moderation_set_busy(true);
	tftpboot_http_moderation('tftpboot_moderation_reject', { id: id, note: note }, function (res) {
		tftpboot_moderation_set_busy(false);
		f_notify(res && res.message ? res.message : 'OK', res && res.code ? 'error' : 'success');
		if (res && !res.code) {
			tftpboot_moderation_close();
			if (typeof res.pending_count === 'number' && typeof tftpboot_moderation_update_count === 'function') {
				tftpboot_moderation_update_count(res.pending_count);
			}
		}
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
		chk.onchange = function () { tftpboot_state.syncWarmDone = false; };
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

function tftpboot_sync_vendors_for_warm() {
	var v = tftpboot_selected_sync_vendors();
	if (v.length) {
		return v;
	}
	return (tftpboot_state.bulkVendors || []).slice();
}

function tftpboot_sync_set_preview_busy(busy) {
	var btn = document.getElementById('tftpboot-sync-preview');
	if (btn) btn.disabled = !!busy;
}

function tftpboot_sync_warm(done) {
	if (tftpboot_state.syncWarmDone || tftpboot_state.syncWarmInFlight) {
		if (done) done();
		return;
	}
	var vendors = tftpboot_sync_vendors_for_warm();
	if (!vendors.length) {
		tftpboot_state.syncWarmDone = true;
		if (done) done();
		return;
	}
	tftpboot_state.syncWarmInFlight = true;
	tftpboot_http_long('tftpboot_sync_warm', { vendors: vendors }, function (res) {
		tftpboot_state.syncWarmInFlight = false;
		tftpboot_state.syncWarmDone = !!(res && !res.code);
		if (done) done();
		if (tftpboot_state.syncPreviewQueued) {
			tftpboot_state.syncPreviewQueued = false;
			tftpboot_sync_preview_run(0);
		}
	});
}

function tftpboot_http_is_timeout(res) {
	if (!res || !res.message) return false;
	var m = String(res.message).toLowerCase();
	return m.indexOf('timeout') >= 0 || m.indexOf('connection lost') >= 0
		|| m.indexOf('error code: 0') >= 0;
}

function tftpboot_moderation_set_busy(busy) {
	tftpboot_state.moderationActionInFlight = !!busy;
	['tftpboot-moderation-approve', 'tftpboot-moderation-reject', 'tftpboot-moderation-back'].forEach(function (id) {
		var el = document.getElementById(id);
		if (el) el.disabled = !!busy;
	});
	var loading = document.getElementById('loading');
	if (loading) loading.style.display = busy ? 'block' : 'none';
}

function tftpboot_http_moderation(action, data, cb, retryCount) {
	var ms = tftpboot_state.moderationHttpMs || 180000;
	tftpboot_http(action, data, function (res) {
		if ((!res || res.code) && (retryCount || 0) < 1 && tftpboot_http_is_timeout(res)) {
			tftpboot_http_moderation(action, data, cb, (retryCount || 0) + 1);
			return;
		}
		if (cb) cb(res);
	}, ms);
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
	var finished = false;
	function finish(result) {
		if (finished) return;
		finished = true;
		if (cb) cb(result);
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
		finish(result);
	};
	xhr.ontimeout = function () {
		finish({ code: 1, message: 'AJAX error: timeout or connection lost' });
	};
	xhr.setRequestHeader('Content-Type', 'application/json');
	if (typeof g_csrf_token !== 'undefined' && g_csrf_token) {
		xhr.setRequestHeader('X-CSRF-Token', g_csrf_token);
	}
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
	tftpboot_pick_build_index();
}

function tftpboot_pick_build_index() {
	var out = [];
	(tftpboot_state.tree || []).forEach(function (v) {
		(v.models || []).forEach(function (m) {
			(m.files || []).forEach(function (f) {
				out.push({
					filename: f.filename,
					label: f.label || '',
					phone: f.phone || '',
					mac: f.mac || '',
					vendorTitle: v.title || '',
					modelTitle: m.title || ''
				});
			});
		});
	});
	tftpboot_state.pickIndex = out;
}

function tftpboot_pick_label(key, fallback) {
	if (tftpboot_state.labels && tftpboot_state.labels[key]) {
		return tftpboot_state.labels[key];
	}
	if (typeof LL === 'object' && LL) {
		if (key === 'pickSearchEmpty' && LL.TftpBootPickSearchEmpty) return LL.TftpBootPickSearchEmpty;
		if (key === 'pickSearchLimit' && LL.TftpBootPickSearchLimit) return LL.TftpBootPickSearchLimit;
	}
	return fallback;
}

function tftpboot_pick_match(row, q) {
	q = String(q || '').trim();
	if (!q) return false;
	var parts = q.indexOf(' - ') >= 0 ? q.split(' - ') : [q];
	var phoneDigits = String(row.phone || '').replace(/\D/g, '');
	var mac = String(row.mac || '').toUpperCase();
	var pi;
	for (pi = 0; pi < parts.length; pi++) {
		var part = String(parts[pi] || '').trim();
		if (!part) continue;
		var qDigits = part.replace(/\D/g, '');
		if (qDigits.length >= 2 && phoneDigits.indexOf(qDigits) >= 0) return true;
		var qHex = part.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
		if (qHex.length >= 2 && mac.indexOf(qHex) >= 0) return true;
	}
	return false;
}

function tftpboot_pick_filter() {
	var qEl = document.getElementById('tftpboot-pick-q');
	var box = document.getElementById('tftpboot-pick-results');
	if (!qEl || !box) return;
	var q = qEl.value.trim();
	if (q.length < 2) {
		tftpboot_state.pickFilteredRows = [];
		box.innerHTML = '';
		box.style.display = 'none';
		return;
	}
	var matched = [];
	var idx = tftpboot_state.pickIndex || [];
	var i;
	for (i = 0; i < idx.length; i++) {
		if (tftpboot_pick_match(idx[i], q)) matched.push(idx[i]);
	}
	var limit = tftpboot_state.pickMatchLimit || 50;
	var truncated = matched.length > limit;
	var show = truncated ? matched.slice(0, limit) : matched;
	tftpboot_state.pickFilteredRows = show;
	tftpboot_pick_render_results(show, truncated ? matched.length : 0);
}

function tftpboot_pick_render_results(rows, totalMatched) {
	var box = document.getElementById('tftpboot-pick-results');
	if (!box) return;
	box.innerHTML = '';
	if (!rows.length) {
		var empty = document.createElement('p');
		empty.className = 'tftpboot-pick-results-msg';
		empty.textContent = tftpboot_pick_label('pickSearchEmpty', 'No matches');
		box.appendChild(empty);
		box.style.display = 'block';
		return;
	}
	var ul = document.createElement('ul');
	ul.className = 'tftpboot-pick-results-list';
	rows.forEach(function (row) {
		var li = document.createElement('li');
		var btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'tftpboot-pick-result';
		btn.setAttribute('data-filename', row.filename);
		var main = document.createElement('span');
		main.className = 'tftpboot-pick-result-label';
		main.textContent = row.label || row.filename;
		btn.appendChild(main);
		if (row.vendorTitle || row.modelTitle) {
			var sub = document.createElement('span');
			sub.className = 'tftpboot-pick-result-meta';
			sub.textContent = [row.vendorTitle, row.modelTitle].filter(Boolean).join(' · ');
			btn.appendChild(sub);
		}
		btn.onclick = function () {
			tftpboot_pick_open(row.filename);
		};
		li.appendChild(btn);
		ul.appendChild(li);
	});
	box.appendChild(ul);
	if (totalMatched > rows.length) {
		var note = document.createElement('p');
		note.className = 'tftpboot-pick-results-msg';
		var tmpl = tftpboot_pick_label('pickSearchLimit', 'Showing first %d of %d');
		note.textContent = tftpboot_format(tmpl, rows.length, totalMatched);
		box.appendChild(note);
	}
	box.style.display = 'block';
}

function tftpboot_format(tmpl, a, b) {
	return String(tmpl).replace('%d', String(a)).replace('%d', String(b));
}

function tftpboot_pick_focus_file(filename) {
	var sel = document.getElementById('tftpboot-vendor');
	var msel = document.getElementById('tftpboot-model');
	var fsel = document.getElementById('tftpboot-file');
	if (!sel || !msel || !fsel) return false;
	var tree = tftpboot_state.tree || [];
	var vi, mi, fi;
	for (vi = 0; vi < tree.length; vi++) {
		var v = tree[vi];
		var models = v.models || [];
		for (mi = 0; mi < models.length; mi++) {
			var files = models[mi].files || [];
			for (fi = 0; fi < files.length; fi++) {
				if (files[fi].filename === filename) {
					sel.value = String(vi);
					sel.onchange();
					msel.value = String(mi);
					msel.onchange();
					fsel.value = filename;
					return true;
				}
			}
		}
	}
	return false;
}

function tftpboot_pick_open(filename) {
	if (!filename) return;
	tftpboot_pick_focus_file(filename);
	tftpboot_open_editor(filename);
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
	return /\/bc/i.test(suffix || '');
}

function tftpboot_remove_dial_bc(suffix) {
	return String(suffix || '').replace(/\/bc/gi, '');
}

function tftpboot_append_dial_bc(suffix) {
	suffix = String(suffix || '').trim();
	if (tftpboot_dial_has_bc(suffix)) return suffix;
	return '@1/bc';
}

function tftpboot_card_merge_number_suffix(card) {
	var numEl = card.querySelector('.tftpboot-key-number');
	if (!numEl || tftpboot_card_is_auto(card)) return card.dataset.dialSuffix || '';
	var num = String(numEl.value || '').trim();
	var sfx = String(card.dataset.dialSuffix || '').trim();
	if (/^(\d+)(@1(?:\/[a-z]+)?)$/i.test(num)) {
		var m = num.match(/^(\d+)(@1(?:\/[a-z]+)?)$/i);
		numEl.value = m[1];
		sfx = m[2].toLowerCase();
		card.dataset.dialSuffix = sfx;
		return sfx;
	}
	if (!sfx && /^@1/i.test(num)) {
		var m2 = num.match(/^(\d*)(@1(?:\/[a-z]+)?)$/i);
		if (m2 && m2[1]) {
			numEl.value = m2[1];
			sfx = m2[2].toLowerCase();
			card.dataset.dialSuffix = sfx;
		}
	}
	return sfx;
}

function tftpboot_type2_line_value(raw) {
	var v = String(raw || '').trim().toUpperCase();
	if (v === 'AUTO') return v;
	if (/^SIP\d+$/.test(v)) return v;
	return '';
}

function tftpboot_type3_line_value(raw) {
	var v = String(raw || '').trim().toUpperCase();
	if (v === 'F_SMS' || v === 'F_MWI' || v === 'F_RECORD') return v;
	return '';
}

function tftpboot_special_line_value(raw) {
	return tftpboot_type2_line_value(raw) || tftpboot_type3_line_value(raw);
}

function tftpboot_type3_default_title(val) {
	var labels = tftpboot_state.labels || {};
	var map = {
		F_SMS: labels.fkeyTitleSms,
		F_MWI: labels.fkeyTitleMwi,
		F_RECORD: labels.fkeyTitleRecord
	};
	if (map[val]) return map[val];
	if (typeof LL === 'object' && LL) {
		if (val === 'F_SMS' && LL.TftpBootFkeyFSms) return LL.TftpBootFkeyFSms;
		if (val === 'F_MWI' && LL.TftpBootFkeyFMwi) return LL.TftpBootFkeyFMwi;
		if (val === 'F_RECORD' && LL.TftpBootFkeyFRecord) return LL.TftpBootFkeyFRecord;
	}
	if (val === 'F_SMS') return 'СМС';
	if (val === 'F_MWI') return 'Почта';
	if (val === 'F_RECORD') return 'Запись';
	return '';
}

function tftpboot_card_is_auto(card) {
	if (card.dataset.fkeyAuto === '1') return true;
	var numEl = card.querySelector('.tftpboot-key-number');
	if (!numEl) return false;
	return tftpboot_special_line_value(numEl.value) !== '';
}

function tftpboot_sync_card_auto_state(card) {
	var numEl = card.querySelector('.tftpboot-key-number');
	var spec = numEl ? tftpboot_special_line_value(numEl.value) : '';
	if (spec) {
		card.dataset.fkeyAuto = '1';
		card.dataset.dialSuffix = '';
		if (numEl) numEl.value = spec;
		var t3 = tftpboot_type3_line_value(spec);
		if (t3) {
			var tit = card.querySelector('.tftpboot-key-title');
			if (tit && !String(tit.value).trim()) {
				tit.value = tftpboot_type3_default_title(t3);
			}
		}
	} else {
		delete card.dataset.fkeyAuto;
	}
	tftpboot_update_phone_icon(card);
	tftpboot_editor_sync_fix_button(card);
}

function tftpboot_update_phone_icon(card) {
	var btn = card.querySelector('.tftpboot-key-phone');
	if (!btn) return;
	if (tftpboot_card_is_auto(card) || tftpboot_card_star_transfer(card)) {
		btn.disabled = true;
		btn.classList.remove('tftpboot-key-phone--green', 'tftpboot-key-phone--red', 'tftpboot-key-phone--neutral');
		btn.classList.add('tftpboot-key-phone--disabled');
		return;
	}
	btn.disabled = false;
	btn.classList.remove('tftpboot-key-phone--disabled');
	var suffix = tftpboot_card_merge_number_suffix(card);
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

function tftpboot_key_cell_title() {
	if (tftpboot_state.labels && tftpboot_state.labels.keyCell) return tftpboot_state.labels.keyCell;
	if (typeof LL === 'object' && LL && LL.TftpBootEditorCell) return LL.TftpBootEditorCell;
	return 'Cell';
}

function tftpboot_key_title_placeholder() {
	if (tftpboot_state.labels && tftpboot_state.labels.keyTitle) return tftpboot_state.labels.keyTitle;
	if (typeof LL === 'object' && LL && LL.TftpBootKeyTitle) return LL.TftpBootKeyTitle;
	return 'Title';
}

function tftpboot_key_number_placeholder() {
	if (tftpboot_state.labels && tftpboot_state.labels.dialNumberHint) return tftpboot_state.labels.dialNumberHint;
	if (typeof LL === 'object' && LL && LL.TftpBootDialNumberHint) return LL.TftpBootDialNumberHint;
	if (tftpboot_state.labels && tftpboot_state.labels.keyNumber) return tftpboot_state.labels.keyNumber;
	if (typeof LL === 'object' && LL && LL.TftpBootNumber) return LL.TftpBootNumber;
	return 'Number';
}

function tftpboot_editor_show_fix() {
	return !tftpboot_state.selfOnly;
}

function tftpboot_card_label_value(card) {
	var tit = card.querySelector('.tftpboot-key-title');
	return tit ? String(tit.value || '').trim() : '';
}

function tftpboot_card_number_value(card) {
	var numEl = card.querySelector('.tftpboot-key-number');
	if (!numEl) return '';
	if (tftpboot_card_is_auto(card) || tftpboot_card_star_transfer(card)) return '';
	return tftpboot_sanitize_dial_number(String(numEl.value || '').trim());
}

function tftpboot_editor_card_can_fix(card) {
	if (!tftpboot_editor_show_fix()) return false;
	if (tftpboot_card_is_auto(card) || tftpboot_card_star_transfer(card)) return false;
	return tftpboot_card_number_value(card) !== '';
}

function tftpboot_editor_card_is_fixed(card) {
	return card.dataset.fixed === '1';
}

function tftpboot_editor_sync_fix_button(card) {
	var fixBtn = card.querySelector('.tftpboot-key-fix');
	if (!fixBtn) return;
	var can = tftpboot_editor_card_can_fix(card);
	var locked = tftpboot_editor_card_is_fixed(card);
	var hidden = !can && !locked;
	fixBtn.style.display = hidden ? 'none' : '';
	if (!locked && !can) {
		fixBtn.disabled = true;
	} else if (!locked) {
		fixBtn.disabled = false;
	}
}

function tftpboot_editor_update_card_fixed_ui(card, locked) {
	if (!card) return;
	card.dataset.fixed = locked ? '1' : '0';
	card.classList.toggle('tftpboot-key-card--fixed', !!locked);
	var numEl = card.querySelector('.tftpboot-key-number');
	var titEl = card.querySelector('.tftpboot-key-title');
	var clr = card.querySelector('.tftpboot-key-clear');
	var fixBtn = card.querySelector('.tftpboot-key-fix');
	if (numEl) numEl.readOnly = !!locked;
	if (titEl) titEl.readOnly = !!locked;
	if (clr) clr.disabled = !!locked;
	if (fixBtn) {
		fixBtn.classList.toggle('tftpboot-key-fix--active', !!locked);
		fixBtn.setAttribute('data-pb-hint', tftpboot_bulk_fix_hint(!!locked));
		fixBtn.disabled = !!(locked && !tftpboot_state.canUnfixBulk);
		if (typeof pb_hint_bind === 'function') {
			pb_hint_bind(fixBtn);
		}
	}
	tftpboot_editor_sync_fix_button(card);
}

function tftpboot_editor_fix_toggle(card) {
	if (!card) return;
	var locked = tftpboot_editor_card_is_fixed(card);
	if (!locked && !tftpboot_editor_card_can_fix(card)) return;
	if (locked && !tftpboot_state.canUnfixBulk) return;
	var number, title;
	if (locked) {
		number = card.dataset.fixedNumber || tftpboot_card_number_value(card);
		title = card.dataset.fixedTitle !== undefined ? card.dataset.fixedTitle : tftpboot_card_label_value(card);
	} else {
		number = tftpboot_card_number_value(card);
		title = tftpboot_card_label_value(card);
	}
	if (!number) return;
	var fixBtn = card.querySelector('.tftpboot-key-fix');
	tftpboot_bulk_btn_anim(fixBtn, 'tftpboot-bulk-fix-pulse');
	tftpboot_http('tftpboot_keys_bulk_fix', { number: number, title: title, fixed: locked ? 0 : 1 }, function (res) {
		f_notify(res && res.message ? res.message : 'OK', res && res.code ? 'error' : 'success');
		if (res && res.code) return;
		var nowFixed = !locked;
		if (nowFixed) {
			card.dataset.fixedNumber = number;
			card.dataset.fixedTitle = title;
		} else {
			delete card.dataset.fixedNumber;
			delete card.dataset.fixedTitle;
		}
		tftpboot_editor_update_card_fixed_ui(card, nowFixed);
	});
}

function tftpboot_create_key_card(k, grid) {
	var card = document.createElement('div');
	card.className = 'tftpboot-key-card';
	card.draggable = true;
	card.dataset.slot = k.slot;
	if (k.key_id) card.dataset.keyId = k.key_id;
	if (k.section) card.dataset.section = k.section;
	var label = escapeHtml(tftpboot_key_cell_title()) + ' #' + k.slot;
	var clrTitle = escapeHtml(tftpboot_key_clear_title());
	var phoneTitle = escapeHtml(tftpboot_key_phone_title());
	var dialSuffix = (k.dial_suffix !== undefined && k.dial_suffix !== null) ? String(k.dial_suffix) : '';
	var displayNum = String(k.number || '').trim();
	if (k.fkey_auto || tftpboot_special_line_value(k.number || k.value)) {
		card.dataset.fkeyAuto = '1';
		dialSuffix = '';
	}
	if (!card.dataset.fkeyAuto) {
		var splitNum = tftpboot_split_star_dial_value(displayNum);
		if (splitNum) {
			displayNum = splitNum.number;
			if (!dialSuffix) dialSuffix = splitNum.suffix;
		} else {
			var splitVal = k.value ? tftpboot_split_star_dial_value(String(k.value).trim()) : null;
			if (splitVal) {
				if (!displayNum || displayNum.indexOf('@1/') >= 0) displayNum = splitVal.number;
				if (!dialSuffix) dialSuffix = splitVal.suffix;
			}
		}
		if (!dialSuffix && k.value && !card.dataset.fkeyAuto) {
			var starVm = String(k.value).trim().match(/^(\*\*|\*8)(.*)$/);
			if (starVm) {
				dialSuffix = starVm[2] || '';
				if (!displayNum || displayNum.indexOf('@1/') >= 0) displayNum = starVm[1];
			} else {
				var vm = String(k.value).trim().match(/^\d+(.*)$/);
				if (vm) dialSuffix = vm[1] || '';
			}
		}
	}
	if (tftpboot_star_dial_prefix(displayNum)) {
		displayNum = tftpboot_normalize_star_dial(displayNum);
		card.dataset.starTransfer = '1';
	}
	card.dataset.dialSuffix = dialSuffix;
	var isFixedInit = !!k.fixed;
	var fixHintInit = escapeHtml(tftpboot_bulk_fix_hint(isFixedInit));
	var fixBtnHtml = '';
	if (tftpboot_editor_show_fix()) {
		fixBtnHtml = '<button type="button" class="tftpboot-key-fix pb-hint' + (isFixedInit ? ' tftpboot-key-fix--active' : '') +
			'" data-pb-hint="' + fixHintInit + '" aria-label="' + fixHintInit + '"></button>';
	}
	card.innerHTML =
		'<span class="tftpboot-key-slot"><span class="tftpboot-key-slot-label">' + label + '</span>' +
		'<span class="tftpboot-key-slot-actions">' +
		'<button type="button" class="tftpboot-key-phone pb-hint" data-pb-hint="' + phoneTitle + '" aria-label="' + phoneTitle + '">&#9742;</button>' +
		fixBtnHtml +
		'<button type="button" class="tftpboot-key-clear pb-hint" data-pb-hint="' + clrTitle + '" aria-label="' + clrTitle + '">&times;</button>' +
		'</span></span>' +
		'<input type="text" class="tftpboot-key-title" value="' + escapeHtml(k.label || '') + '" placeholder="' +
			escapeHtml(tftpboot_key_title_placeholder()) + '" />' +
		'<input type="text" class="tftpboot-key-number" value="' + escapeHtml(displayNum) + '" placeholder="' +
			escapeHtml(tftpboot_key_number_placeholder()) + '" />';
	tftpboot_update_phone_icon(card);
	var phoneBtn = card.querySelector('.tftpboot-key-phone');
	if (phoneBtn) {
		phoneBtn.onclick = function (e) {
			e.preventDefault();
			e.stopPropagation();
			if (tftpboot_card_is_auto(card) || tftpboot_card_star_transfer(card) || phoneBtn.disabled) return;
			var sfx = tftpboot_card_merge_number_suffix(card);
			if (tftpboot_dial_has_bc(sfx)) {
				card.dataset.dialSuffix = tftpboot_remove_dial_bc(sfx);
			} else {
				card.dataset.dialSuffix = tftpboot_append_dial_bc(sfx);
			}
			tftpboot_update_phone_icon(card);
			delete card.dataset.clear;
		};
	}
	var numInp = card.querySelector('.tftpboot-key-number');
	var titInp = card.querySelector('.tftpboot-key-title');
	if (numInp) {
		if (!tftpboot_card_is_auto(card)) tftpboot_bind_dial_number_input(numInp);
		if (!tftpboot_card_is_auto(card)) {
			tftpboot_phonebook_bind_lookup(numInp, 'number', function (row) {
				tftpboot_editor_ac_apply(card, row);
			});
		}
		numInp.addEventListener('input', function () {
			var splitFull = tftpboot_split_star_dial_value(numInp.value);
			if (splitFull) {
				numInp.value = splitFull.number;
				if (splitFull.suffix) card.dataset.dialSuffix = splitFull.suffix;
			}
			tftpboot_sync_card_auto_state(card);
			if (tftpboot_star_dial_prefix(numInp.value)) {
				card.dataset.starTransfer = '1';
			} else {
				delete card.dataset.starTransfer;
			}
			if (!tftpboot_card_is_auto(card)) {
				var v = tftpboot_sanitize_dial_number(numInp.value);
				if (numInp.value !== v) numInp.value = v;
			}
			tftpboot_update_phone_icon(card);
			tftpboot_editor_sync_fix_button(card);
		});
	}
	if (titInp) {
		tftpboot_phonebook_bind_lookup(titInp, 'name', function (row) {
			tftpboot_editor_ac_apply(card, row);
		});
	}
	var fixBtn = card.querySelector('.tftpboot-key-fix');
	if (fixBtn) {
		fixBtn.onclick = function (e) {
			e.preventDefault();
			e.stopPropagation();
			tftpboot_editor_fix_toggle(card);
		};
	}
	var clr = card.querySelector('.tftpboot-key-clear');
	clr.onclick = function (e) {
		e.preventDefault();
		e.stopPropagation();
		if (tftpboot_editor_card_is_fixed(card)) return;
		card.querySelector('.tftpboot-key-title').value = '';
		card.querySelector('.tftpboot-key-number').value = '';
		card.dataset.dialSuffix = '';
		delete card.dataset.fkeyAuto;
		delete card.dataset.starTransfer;
		delete card.dataset.fixed;
		delete card.dataset.fixedNumber;
		delete card.dataset.fixedTitle;
		card.classList.remove('tftpboot-key-card--fixed');
		tftpboot_update_phone_icon(card);
		tftpboot_editor_sync_fix_button(card);
		card.dataset.clear = '1';
	};
	card.querySelectorAll('input').forEach(function (inp) {
		inp.addEventListener('input', function () {
			delete card.dataset.clear;
			inp.classList.remove('tftpboot-field-error');
		});
	});
	tftpboot_sync_card_auto_state(card);
	tftpboot_bind_dnd(card, grid);
	if (k.fixed) {
		card.dataset.fixedNumber = tftpboot_card_number_value(card);
		card.dataset.fixedTitle = tftpboot_card_label_value(card);
		tftpboot_editor_update_card_fixed_ui(card, true);
	} else {
		tftpboot_editor_sync_fix_button(card);
	}
	if (typeof pb_hint_bind === 'function') {
		card.querySelectorAll('.tftpboot-key-phone, .tftpboot-key-clear, .tftpboot-key-fix').forEach(pb_hint_bind);
	}
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

function tftpboot_layout_grid_spec(fullLayout, sectionId) {
	if (!fullLayout || typeof fullLayout !== 'object') return null;
	if (fullLayout.sections && sectionId) {
		if (fullLayout.sections[sectionId]) return fullLayout.sections[sectionId];
		var sid = String(sectionId).toLowerCase();
		var keys = Object.keys(fullLayout.sections);
		for (var i = 0; i < keys.length; i++) {
			if (keys[i].toLowerCase() === sid) return fullLayout.sections[keys[i]];
		}
	}
	if (fullLayout.default) return fullLayout.default;
	return null;
}

function tftpboot_apply_keys_grid_layout(grid, spec) {
	if (!grid || !spec) return;
	var cols = parseInt(spec.cols, 10) || 1;
	if (cols < 1) cols = 1;
	if (cols > 12) cols = 12;
	var order = spec.order && spec.order.length ? spec.order.slice() : null;
	if (!order || !order.length) {
		var slots = [];
		Array.prototype.forEach.call(grid.children, function (card) {
			var s = parseInt(card.dataset.slot, 10);
			if (!isNaN(s)) slots.push(s);
		});
		slots.sort(function (a, b) { return a - b; });
		if (!slots.length) return;
		var rowsHint = parseInt(spec.rows, 10);
		order = tftpboot_layout_default_order_from_slots(slots, cols, rowsHint);
	}
	var rows = parseInt(spec.rows, 10);
	var slotList = [];
	Array.prototype.forEach.call(grid.children, function (card) {
		var s = parseInt(card.dataset.slot, 10);
		if (!isNaN(s)) slotList.push(s);
	});
	var gridRows = tftpboot_layout_effective_rows(slotList, cols, rows);
	grid.classList.add('tftpboot-keys-grid--layout');
	grid.style.display = 'grid';
	grid.style.gridTemplateColumns = 'repeat(' + cols + ', minmax(0, 1fr))';
	if (gridRows >= 1 && gridRows <= 64) {
		grid.style.gridTemplateRows = 'repeat(' + gridRows + ', auto)';
	} else {
		grid.style.gridTemplateRows = '';
	}
	var bySlot = {};
	Array.prototype.forEach.call(grid.children, function (card) {
		var s = parseInt(card.dataset.slot, 10);
		if (!isNaN(s)) bySlot[s] = card;
	});
	order.forEach(function (slot) {
		slot = parseInt(slot, 10);
		if (bySlot[slot]) grid.appendChild(bySlot[slot]);
	});
}

function tftpboot_append_section_panel(root, group, opts) {
	opts = opts || {};
	var grid = document.createElement('div');
	grid.className = 'tftpboot-keys-grid';
	if (group.section) grid.dataset.tftpbootSection = group.section;
	group.keys.forEach(function (k) {
		grid.appendChild(tftpboot_create_key_card(k, grid));
	});
	var lay = tftpboot_layout_grid_spec(tftpboot_state.editorLayout, group.section || '');
	if (lay) tftpboot_apply_keys_grid_layout(grid, lay);
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
		panel.className = 'tftpboot-dsskey-panel';
		panel.dataset.panel = String(idx);
		if (idx > 0) panel.style.display = 'none';
		var grid = document.createElement('div');
		grid.className = 'tftpboot-keys-grid';
		if (group.section) grid.dataset.tftpbootSection = group.section;
		group.keys.forEach(function (k) {
			grid.appendChild(tftpboot_create_key_card(k, grid));
		});
		var lay = tftpboot_layout_grid_spec(tftpboot_state.editorLayout, group.section || '');
		if (lay) tftpboot_apply_keys_grid_layout(grid, lay);
		panel.appendChild(grid);
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
	tftpboot_state.editorLayout = (cfg.layout && typeof cfg.layout === 'object') ? cfg.layout : {};
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
	if (typeof pb_hint_init === 'function') {
		pb_hint_init(root);
	}
}

function tftpboot_editor_clear_drop_hints(grid) {
	if (!grid) return;
	Array.prototype.forEach.call(grid.children, function (el) {
		el.classList.remove('tftpboot-key-drop-hint');
	});
}

function tftpboot_bind_dnd(card, grid) {
	card.addEventListener('dragstart', function (e) {
		grid._tftpbootDragCard = card;
		e.dataTransfer.setData('text/plain', card.dataset.keyId || card.dataset.section + ':' + card.dataset.slot);
		e.dataTransfer.effectAllowed = 'move';
		card.classList.add('tftpboot-dragging');
	});
	card.addEventListener('dragend', function () {
		card.classList.remove('tftpboot-dragging');
		tftpboot_editor_clear_drop_hints(grid);
		grid._tftpbootDragCard = null;
	});
	card.addEventListener('dragover', function (e) {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		var from = grid._tftpbootDragCard;
		if (!from || from === card) return;
		tftpboot_editor_clear_drop_hints(grid);
		card.classList.add('tftpboot-key-drop-hint');
	});
	card.addEventListener('dragleave', function (e) {
		if (!e.relatedTarget || !card.contains(e.relatedTarget)) {
			card.classList.remove('tftpboot-key-drop-hint');
		}
	});
	card.addEventListener('drop', function (e) {
		e.preventDefault();
		tftpboot_editor_clear_drop_hints(grid);
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
		tftpboot_mark_clear_if_empty(from);
		tftpboot_mark_clear_if_empty(card);
	});
}

function tftpboot_card_is_empty(card) {
	if (!card) return true;
	var titleEl = card.querySelector('.tftpboot-key-title');
	var numEl = card.querySelector('.tftpboot-key-number');
	var lab = titleEl ? String(titleEl.value || '').trim() : '';
	var num = numEl ? String(numEl.value || '').trim() : '';
	if (lab || num) return false;
	if (tftpboot_special_line_value(num)) return false;
	return true;
}

function tftpboot_mark_clear_if_empty(card) {
	if (!card || !card.dataset.keyId) return;
	if (tftpboot_card_is_empty(card)) {
		card.dataset.clear = '1';
	} else {
		delete card.dataset.clear;
	}
}

function tftpboot_close_editor() {
	tftpboot_bulk_ac_close();
	document.getElementById('tftpboot-editor').style.display = 'none';
}

function tftpboot_save_editor() {
	var fn = document.getElementById('tftpboot-editor-filename').value;
	var keys = [];
	var clearIds = [];
	var blocked = false;
	tftpboot_clear_dial_field_errors(document.getElementById('tftpboot-editor'));
	document.querySelectorAll('#tftpboot-editor-sections .tftpboot-key-card').forEach(function (card) {
		if (blocked) return;
		var numRaw = card.querySelector('.tftpboot-key-number').value;
		var spec = tftpboot_special_line_value(numRaw);
		var numVal = spec || tftpboot_sanitize_dial_number(numRaw);
		var suffix = spec ? '' : (card.dataset.dialSuffix || '');
		if (!spec && tftpboot_is_star_transfer_dial(numVal) && !suffix) {
			suffix = '@1/f';
		}
		var row = {
			slot: parseInt(card.dataset.slot, 10),
			label: card.querySelector('.tftpboot-key-title').value,
			number: numVal,
			dial_suffix: suffix
		};
		if (!String(row.label).trim() && tftpboot_type3_line_value(row.number)) {
			row.label = tftpboot_type3_default_title(row.number);
		}
		var err = tftpboot_validate_dial_pair_detail(row.label, row.number, spec);
		if (err) {
			blocked = true;
			tftpboot_show_dial_pair_error(card, err.code, err.message);
			return;
		}
		if (card.dataset.keyId) row.key_id = card.dataset.keyId;
		if (card.dataset.section) row.section = card.dataset.section;
		keys.push(row);
		if (card.dataset.clear === '1' && card.dataset.keyId) {
			clearIds.push(card.dataset.keyId);
		}
	});
	if (blocked) return;
	var post = { filename: fn, speedDialKeys: keys, clear_key_ids: clearIds };
	var disp = document.getElementById('tftpboot-sip-display');
	if (disp) post.displayName = disp.value;
	var action = tftpboot_state.selfOnly ? 'tftpboot_moderation_submit' : 'tftpboot_config_save';
	var httpFn = tftpboot_state.selfOnly ? tftpboot_http_moderation : tftpboot_http;
	if (tftpboot_state.moderationSubmitInFlight) return;
	tftpboot_state.moderationSubmitInFlight = true;
	var loading = document.getElementById('loading');
	if (loading) loading.style.display = 'block';
	httpFn(action, post, function (res) {
		tftpboot_state.moderationSubmitInFlight = false;
		if (loading) loading.style.display = 'none';
		f_notify(res && res.message ? res.message : 'OK', res && res.code ? 'error' : 'success');
		if (res && !res.code && tftpboot_state.selfOnly) {
			tftpboot_self_init();
		}
	});
}

function tftpboot_selected_vendors() {
	var v = [];
	document.querySelectorAll('.tftpboot-bulk-vendor:checked').forEach(function (el) { v.push(el.value); });
	return v;
}

function tftpboot_bulk_fetch(onDone) {
	var vendors = tftpboot_selected_vendors();
	if (!vendors.length) {
		tftpboot_state.bulkAllRows = [];
		tftpboot_bulk_filter();
		if (onDone) onDone();
		return;
	}
	var loading = document.getElementById('loading');
	if (loading) loading.style.display = 'block';
	tftpboot_http('tftpboot_keys_search', { q: '', vendors: vendors }, function (res) {
		if (loading) loading.style.display = 'none';
		if (!res || res.code) {
			f_notify(res && res.message ? res.message : 'Error', 'error');
			if (onDone) onDone();
			return;
		}
		tftpboot_state.bulkAllRows = res.rows || [];
		tftpboot_bulk_filter();
		if (onDone) onDone();
	});
}

function tftpboot_bulk_refresh() {
	tftpboot_bulk_ac_close();
	var btn = document.getElementById('tftpboot-bulk-refresh');
	if (btn) {
		btn.disabled = true;
		btn.classList.add('tftpboot-bulk-head-refresh-busy');
	}
	tftpboot_bulk_fetch(function () {
		if (btn) {
			btn.disabled = false;
			btn.classList.remove('tftpboot-bulk-head-refresh-busy');
		}
	});
}

function tftpboot_bulk_refresh_phonebook() {
	var btn = document.getElementById('tftpboot-bulk-refresh-pb');
	if (btn) btn.disabled = true;
	tftpboot_bulk_ensure_phonebook_cache(function () {
		if (btn) btn.disabled = false;
	}, true);
}

function tftpboot_bulk_row_missing_pb(r) {
	return r && r.in_phonebook === false;
}

function tftpboot_bulk_compare_rows(a, b, col, dir) {
	var mul = dir < 0 ? -1 : 1;
	var na;
	var nb;
	if (col === 'count') {
		na = parseInt(a.count, 10) || 0;
		nb = parseInt(b.count, 10) || 0;
		if (na !== nb) return (na - nb) * mul;
		return tftpboot_bulk_compare_rows(a, b, 'number', 1);
	}
	if (col === 'title') {
		na = String(a.title || '');
		nb = String(b.title || '');
		var c = na.localeCompare(nb, undefined, { sensitivity: 'base' });
		if (c !== 0) return c * mul;
		return tftpboot_bulk_compare_rows(a, b, 'number', 1);
	}
	na = String(a.number || '');
	nb = String(b.number || '');
	var d = na.replace(/\D/g, '');
	var e = nb.replace(/\D/g, '');
	if (d !== '' && e !== '' && d !== e) {
		if (d.length !== e.length) return (d.length - e.length) * mul;
		if (d < e) return -1 * mul;
		if (d > e) return 1 * mul;
	}
	na = na.toLowerCase();
	nb = nb.toLowerCase();
	if (na < nb) return -1 * mul;
	if (na > nb) return 1 * mul;
	return 0;
}

function tftpboot_bulk_apply_sort(rows) {
	var col = tftpboot_state.bulkSortCol;
	if (!col || !rows.length) return rows;
	var dir = tftpboot_state.bulkSortDir;
	var sorted = rows.slice();
	sorted.sort(function (a, b) {
		return tftpboot_bulk_compare_rows(a, b, col, dir);
	});
	return sorted;
}

function tftpboot_bulk_update_sort_ui() {
	var col = tftpboot_state.bulkSortCol;
	var dir = tftpboot_state.bulkSortDir;
	document.querySelectorAll('#tftpboot-bulk-table .tftpboot-bulk-sort').forEach(function (th) {
		var key = th.getAttribute('data-sort');
		var ind = th.querySelector('.tftpboot-bulk-sort-ind');
		var active = key === col;
		th.classList.toggle('tftpboot-bulk-sort-active', active);
		if (ind) {
			ind.textContent = active ? (dir > 0 ? ' ▲' : ' ▼') : '';
		}
		var asc = (tftpboot_state.labels && tftpboot_state.labels.bulkSortAsc) || 'Asc';
		var desc = (tftpboot_state.labels && tftpboot_state.labels.bulkSortDesc) || 'Desc';
		th.title = active ? (dir > 0 ? asc : desc) : '';
		th.setAttribute('aria-sort', active ? (dir > 0 ? 'ascending' : 'descending') : 'none');
	});
}

function tftpboot_bulk_sort_toggle(col) {
	if (!col) return;
	if (tftpboot_state.bulkSortCol === col) {
		tftpboot_state.bulkSortDir = tftpboot_state.bulkSortDir > 0 ? -1 : 1;
	} else {
		tftpboot_state.bulkSortCol = col;
		tftpboot_state.bulkSortDir = 1;
	}
	tftpboot_bulk_update_sort_ui();
	tftpboot_bulk_filter();
}

function tftpboot_bulk_bind_table_head() {
	var table = document.getElementById('tftpboot-bulk-table');
	if (!table) return;
	document.querySelectorAll('#tftpboot-bulk-table .tftpboot-bulk-sort').forEach(function (th) {
		if (th.getAttribute('data-sort-bound')) return;
		th.setAttribute('data-sort-bound', '1');
		var col = th.getAttribute('data-sort');
		th.style.cursor = 'pointer';
		var fire = function () { tftpboot_bulk_sort_toggle(col); };
		th.addEventListener('click', fire);
		th.addEventListener('keydown', function (e) {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				fire();
			}
		});
	});
	var chkFixed = document.getElementById('tftpboot-bulk-chk-fixed');
	var chkMiss = document.getElementById('tftpboot-bulk-chk-missing');
	if (chkFixed && !chkFixed.getAttribute('data-bound')) {
		chkFixed.setAttribute('data-bound', '1');
		chkFixed.addEventListener('change', function () {
			tftpboot_state.bulkFilterFixed = !!chkFixed.checked;
			tftpboot_state.bulkPage = 0;
			tftpboot_bulk_filter();
		});
	}
	if (chkMiss && !chkMiss.getAttribute('data-bound')) {
		chkMiss.setAttribute('data-bound', '1');
		chkMiss.addEventListener('change', function () {
			tftpboot_state.bulkFilterMissing = !!chkMiss.checked;
			tftpboot_state.bulkPage = 0;
			tftpboot_bulk_filter();
		});
	}
	var btnRefresh = document.getElementById('tftpboot-bulk-refresh');
	if (btnRefresh && !btnRefresh.getAttribute('data-bound')) {
		btnRefresh.setAttribute('data-bound', '1');
		btnRefresh.addEventListener('click', tftpboot_bulk_refresh);
	}
	var btnRefreshPb = document.getElementById('tftpboot-bulk-refresh-pb');
	if (btnRefreshPb && !btnRefreshPb.getAttribute('data-bound')) {
		btnRefreshPb.setAttribute('data-bound', '1');
		btnRefreshPb.addEventListener('click', tftpboot_bulk_refresh_phonebook);
	}
	if (typeof pb_hint_init === 'function') {
		pb_hint_init(table.querySelector('thead'));
	}
	tftpboot_bulk_update_sort_ui();
}

function tftpboot_bulk_filter() {
	var chkFixed = document.getElementById('tftpboot-bulk-chk-fixed');
	var chkMiss = document.getElementById('tftpboot-bulk-chk-missing');
	if (chkFixed) tftpboot_state.bulkFilterFixed = !!chkFixed.checked;
	if (chkMiss) tftpboot_state.bulkFilterMissing = !!chkMiss.checked;
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
	var wantFixed = !!tftpboot_state.bulkFilterFixed;
	var wantMiss = !!tftpboot_state.bulkFilterMissing;
	if (wantFixed || wantMiss) {
		var fixedRows = [];
		var missRows = [];
		filtered.forEach(function (r) {
			var isFixed = tftpboot_bulk_row_fixed(r);
			var isMiss = tftpboot_bulk_row_missing_pb(r);
			if (wantFixed && wantMiss) {
				if (isFixed) fixedRows.push(r);
				else if (isMiss) missRows.push(r);
			} else if (wantFixed && isFixed) {
				fixedRows.push(r);
			} else if (wantMiss && isMiss) {
				missRows.push(r);
			}
		});
		if (wantFixed && wantMiss) {
			filtered = fixedRows.concat(missRows);
		} else if (wantFixed) {
			filtered = fixedRows;
		} else {
			filtered = missRows;
		}
	}
	filtered = tftpboot_bulk_apply_sort(filtered);
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

function tftpboot_bulk_fix_label() {
	if (tftpboot_state.labels && tftpboot_state.labels.bulkFix) {
		return tftpboot_state.labels.bulkFix;
	}
	if (typeof LL === 'object' && LL && LL.TftpBootBulkFix) {
		return LL.TftpBootBulkFix;
	}

	return 'Fix';
}

function tftpboot_bulk_fix_hint(fixed) {
	var L = tftpboot_state.labels || {};
	if (fixed) {
		if (tftpboot_state.canUnfixBulk && L.bulkFixHintOff) return L.bulkFixHintOff;
		if (L.bulkFixHintLocked) return L.bulkFixHintLocked;
		return '';
	}
	return L.bulkFixHintOn || '';
}

function tftpboot_bulk_row_fixed(r) {
	return !!(r && r.fixed);
}

function tftpboot_bulk_set_row_locked_ui(tr, locked) {
	if (!tr) return;
	tr.classList.toggle('tftpboot-bulk-row-fixed', locked);
	var numEl = tr.querySelector('.tftpboot-bulk-num');
	var titEl = tr.querySelector('.tftpboot-bulk-title');
	var saveBtn = tr.querySelector('.tftpboot-bulk-one');
	var delBtn = tr.querySelector('.tftpboot-bulk-del');
	var fixBtn = tr.querySelector('.tftpboot-bulk-fix');
	if (numEl) numEl.readOnly = !!locked;
	if (titEl) titEl.readOnly = !!locked;
	if (saveBtn) saveBtn.disabled = !!locked;
	if (delBtn) delBtn.disabled = !!locked;
	if (fixBtn) {
		fixBtn.classList.toggle('tftpboot-bulk-fix-active', !!locked);
		fixBtn.setAttribute('data-pb-hint', tftpboot_bulk_fix_hint(!!locked));
		if (typeof pb_hint_bind === 'function') {
			pb_hint_bind(fixBtn);
		}
		fixBtn.disabled = !!(locked && !tftpboot_state.canUnfixBulk);
	}
}

function tftpboot_bulk_btn_anim(btn, cls) {
	if (!btn) return;
	btn.classList.remove(cls);
	void btn.offsetWidth;
	btn.classList.add(cls);
	btn.addEventListener('animationend', function onEnd() {
		btn.classList.remove(cls);
		btn.removeEventListener('animationend', onEnd);
	});
}

function tftpboot_bulk_fix_toggle(idx) {
	var r = tftpboot_state.bulkRows[idx];
	if (!r) return;
	var locked = tftpboot_bulk_row_fixed(r);
	if (locked && !tftpboot_state.canUnfixBulk) return;
	var fixBtn = document.querySelector('.tftpboot-bulk-fix[data-idx="' + idx + '"]');
	tftpboot_bulk_btn_anim(fixBtn, 'tftpboot-bulk-fix-pulse');
	var payload = {
		number: r.old_number || r.number,
		title: r.old_title !== undefined ? r.old_title : r.title,
		fixed: locked ? 0 : 1
	};
	tftpboot_http('tftpboot_keys_bulk_fix', payload, function (res) {
		f_notify(res && res.message ? res.message : 'OK', res && res.code ? 'error' : 'success');
		if (res && !res.code) tftpboot_bulk_fetch();
	});
}

var g_tftpboot_bulk_ac = { box: null, anchor: null, scrollEl: null, onScroll: null };

function tftpboot_bulk_ac_close() {
	if (g_tftpboot_bulk_ac.box) {
		g_tftpboot_bulk_ac.box.remove();
		g_tftpboot_bulk_ac.box = null;
	}
	g_tftpboot_bulk_ac.anchor = null;
	if (g_tftpboot_bulk_ac.scrollEl && g_tftpboot_bulk_ac.onScroll) {
		g_tftpboot_bulk_ac.scrollEl.removeEventListener('scroll', g_tftpboot_bulk_ac.onScroll);
	}
	g_tftpboot_bulk_ac.scrollEl = null;
	g_tftpboot_bulk_ac.onScroll = null;
	document.removeEventListener('click', tftpboot_bulk_ac_outside_click, true);
}

function tftpboot_bulk_ac_position(inp, box) {
	var r = inp.getBoundingClientRect();
	box.style.position = 'fixed';
	box.style.left = r.left + 'px';
	box.style.top = r.bottom + 'px';
	box.style.minWidth = Math.max(r.width, 220) + 'px';
	box.style.maxWidth = Math.min(420, Math.max(220, window.innerWidth * 0.96)) + 'px';
}

function tftpboot_bulk_ac_outside_click(e) {
	var box = g_tftpboot_bulk_ac.box;
	if (!box) return;
	if (box.contains(e.target)) return;
	if (g_tftpboot_bulk_ac.anchor && (e.target === g_tftpboot_bulk_ac.anchor || g_tftpboot_bulk_ac.anchor.contains(e.target))) {
		return;
	}
	tftpboot_bulk_ac_close();
}

function tftpboot_bulk_phonebook_filter(mode, query) {
	var rows = tftpboot_state.phonebookRows;
	if (!rows || !rows.length) return [];
	var limit = tftpboot_state.bulkLookupMatchLimit || 20;
	var out = [];
	var i;
	if (mode === 'number') {
		var numQ = tftpboot_sanitize_dial_number(query);
		if (!numQ || tftpboot_special_line_value(numQ) || tftpboot_star_dial_prefix(numQ)) return [];
		if (numQ.length < tftpboot_state.bulkLookupMinDigits) return [];
		for (i = 0; i < rows.length && out.length < limit; i++) {
			if (String(rows[i].number || '').indexOf(numQ) === 0) out.push(rows[i]);
		}
	} else {
		var nameQ = String(query || '').trim().toLowerCase();
		if (nameQ.length < tftpboot_state.bulkLookupMinName) return [];
		for (i = 0; i < rows.length && out.length < limit; i++) {
			var nm = String(rows[i].name || '').toLowerCase();
			if (nm.indexOf(nameQ) === 0) out.push(rows[i]);
		}
	}
	return out;
}

function tftpboot_bulk_ensure_phonebook_cache(cb, force) {
	if (force) tftpboot_state.phonebookRows = null;
	if (tftpboot_state.phonebookRows) {
		if (cb) cb();
		return;
	}
	if (tftpboot_state.phonebookLoading) {
		tftpboot_state.phonebookLoadQueue = tftpboot_state.phonebookLoadQueue || [];
		var queued = cb;
		if (force) {
			queued = function () {
				tftpboot_state.phonebookRows = null;
				tftpboot_bulk_ensure_phonebook_cache(cb, true);
			};
		}
		if (queued) tftpboot_state.phonebookLoadQueue.push(queued);
		return;
	}
	tftpboot_state.phonebookLoading = true;
	tftpboot_http('tftpboot_directory', { refresh: 1 }, function (res) {
		tftpboot_state.phonebookLoading = false;
		if (res && !res.code) tftpboot_state.phonebookRows = res.rows || [];
		var queue = tftpboot_state.phonebookLoadQueue || [];
		tftpboot_state.phonebookLoadQueue = [];
		if (cb) cb();
		queue.forEach(function (fn) { fn(); });
	});
}

function tftpboot_editor_ac_apply(card, row) {
	if (!card || tftpboot_editor_card_is_fixed(card)) return;
	var numEl = card.querySelector('.tftpboot-key-number');
	var titEl = card.querySelector('.tftpboot-key-title');
	if (numEl) {
		numEl.value = row.number || '';
		numEl.classList.remove('tftpboot-field-error');
	}
	if (titEl) {
		titEl.value = row.name || '';
		titEl.classList.remove('tftpboot-field-error');
	}
	delete card.dataset.clear;
	tftpboot_sync_card_auto_state(card);
	tftpboot_update_phone_icon(card);
	tftpboot_editor_sync_fix_button(card);
}

function tftpboot_bulk_ac_apply(idx, row) {
	var numEl = document.querySelector('.tftpboot-bulk-num[data-idx="' + idx + '"]');
	var titEl = document.querySelector('.tftpboot-bulk-title[data-idx="' + idx + '"]');
	if (numEl) {
		numEl.value = row.number || '';
		numEl.classList.remove('tftpboot-field-error');
	}
	if (titEl) {
		titEl.value = row.name || '';
		titEl.classList.remove('tftpboot-field-error');
	}
	tftpboot_bulk_ac_close();
}

function tftpboot_ac_scroll_parent(inp) {
	var el = inp && inp.parentElement;
	while (el && el !== document.body) {
		if (el.classList && (el.classList.contains('tftpboot-bulk-scroll')
			|| el.classList.contains('tftpboot-editor-content')
			|| el.classList.contains('tftpboot-editor-sections-scroll'))) {
			return el;
		}
		var st = window.getComputedStyle(el);
		if (/(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight) {
			return el;
		}
		el = el.parentElement;
	}
	return null;
}

function tftpboot_bulk_ac_show(inp, matches, onPick) {
	if (!matches.length) {
		if (g_tftpboot_bulk_ac.anchor === inp) tftpboot_bulk_ac_close();
		return;
	}
	tftpboot_bulk_ac_close();
	var box = document.createElement('div');
	box.id = 'tftpboot-bulk-ac';
	box.className = 'autocomplete-items pb-popup-list tftpboot-bulk-ac-items';
	document.body.appendChild(box);
	g_tftpboot_bulk_ac.box = box;
	g_tftpboot_bulk_ac.anchor = inp;
	var idx = inp.getAttribute('data-idx');
	matches.forEach(function (row) {
		var item = document.createElement('div');
		item.className = 'tftpboot-bulk-ac-item';
		item.textContent = (row.number || '') + ' — ' + (row.name || '');
		item.addEventListener('mousedown', function (e) {
			e.preventDefault();
			if (onPick) {
				onPick(row);
				tftpboot_bulk_ac_close();
			} else {
				tftpboot_bulk_ac_apply(idx, row);
			}
		});
		box.appendChild(item);
	});
	tftpboot_bulk_ac_position(inp, box);
	var scrollEl = document.querySelector('#tftpboot-bulk-modal .tftpboot-bulk-scroll');
	if (!scrollEl && inp) scrollEl = tftpboot_ac_scroll_parent(inp);
	if (scrollEl) {
		g_tftpboot_bulk_ac.scrollEl = scrollEl;
		g_tftpboot_bulk_ac.onScroll = tftpboot_bulk_ac_close;
		scrollEl.addEventListener('scroll', g_tftpboot_bulk_ac.onScroll, { passive: true });
	}
	setTimeout(function () {
		document.addEventListener('click', tftpboot_bulk_ac_outside_click, true);
	}, 0);
}

function tftpboot_phonebook_bind_lookup(inp, mode, onPick) {
	if (!inp || inp.disabled || inp.readOnly) return;
	inp.setAttribute('autocomplete', 'off');
	var timer = null;
	var schedule = function () {
		if (inp.readOnly) return;
		clearTimeout(timer);
		timer = setTimeout(function () {
			tftpboot_bulk_ensure_phonebook_cache(function () {
				var matches = tftpboot_bulk_phonebook_filter(mode, inp.value);
				tftpboot_bulk_ac_show(inp, matches, onPick);
			});
		}, 200);
	};
	inp.addEventListener('input', function () {
		if (inp.readOnly) return;
		if (mode === 'number') {
			var v = tftpboot_sanitize_dial_number(inp.value);
			if (tftpboot_special_line_value(v) || tftpboot_star_dial_prefix(v)) {
				if (g_tftpboot_bulk_ac.anchor === inp) tftpboot_bulk_ac_close();
				return;
			}
		}
		schedule();
	});
	inp.addEventListener('keydown', function (e) {
		if (e.key === 'Escape') tftpboot_bulk_ac_close();
	});
}

function tftpboot_bulk_bind_lookup(inp, mode) {
	tftpboot_phonebook_bind_lookup(inp, mode, function (row) {
		tftpboot_bulk_ac_apply(inp.getAttribute('data-idx'), row);
	});
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
	tftpboot_bulk_ac_close();
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
	var fixLbl = escapeHtml(tftpboot_bulk_fix_label());
	tftpboot_state.bulkRows.forEach(function (r, idx) {
		var tr = document.createElement('tr');
		var rowCls = [];
		if (r.in_phonebook === false) rowCls.push('tftpboot-bulk-missing-pb');
		if (tftpboot_bulk_row_fixed(r)) rowCls.push('tftpboot-bulk-row-fixed');
		if (rowCls.length) tr.className = rowCls.join(' ');
		var isFixed = tftpboot_bulk_row_fixed(r);
		var noTitle = !String(r.title || '').trim();
		var tipText = (noTitle && r.locations && r.locations.length)
			? tftpboot_bulk_location_title(r.locations)
			: '';
		if (r.in_phonebook === false) {
			tipText = (tftpboot_state.labels && tftpboot_state.labels.bulkNotInPhonebook)
				? tftpboot_state.labels.bulkNotInPhonebook
				: 'Not in directory';
		}
		var hintAttr = tipText ? ' data-pb-hint="' + escapeHtml(tipText) + '"' : '';
		var numCls = 'tftpboot-bulk-num' + (tipText ? ' pb-hint' : '');
		var titleCls = 'tftpboot-bulk-title' + (tipText ? ' pb-hint' : '');
		tr.innerHTML =
			'<td><input type="text" class="' + numCls + '" data-idx="' + idx + '" value="' + escapeHtml(r.number || '') + '"' + hintAttr + ' /></td>' +
			'<td><input type="text" class="' + titleCls + '" data-idx="' + idx + '" value="' + escapeHtml(r.title || '') + '"' + hintAttr + ' /></td>' +
			'<td class="tftpboot-bulk-count">' + (r.count || 0) + '</td>' +
			'<td class="tftpboot-bulk-actions">' +
			'<button type="button" class="button-other tftpboot-bulk-fix pb-hint' + (isFixed ? ' tftpboot-bulk-fix-active' : '') + '" data-idx="' + idx + '" data-pb-hint="' + escapeHtml(tftpboot_bulk_fix_hint(isFixed)) + '">' + fixLbl + '</button> ' +
			'<button type="button" class="button-other tftpboot-bulk-one" data-idx="' + idx + '">' + saveLbl + '</button> ' +
			'<button type="button" class="button-decline tftpboot-bulk-del" data-idx="' + idx + '">' + delLbl + '</button></td>';
		tb.appendChild(tr);
		tftpboot_bulk_set_row_locked_ui(tr, isFixed);
	});
	document.querySelectorAll('.tftpboot-bulk-fix').forEach(function (btn) {
		btn.onclick = function () { tftpboot_bulk_fix_toggle(parseInt(btn.getAttribute('data-idx'), 10)); };
	});
	document.querySelectorAll('.tftpboot-bulk-one').forEach(function (btn) {
		btn.onclick = function () { tftpboot_bulk_save_one(parseInt(btn.getAttribute('data-idx'), 10)); };
	});
	document.querySelectorAll('.tftpboot-bulk-del').forEach(function (btn) {
		btn.onclick = function () { tftpboot_bulk_delete_one(parseInt(btn.getAttribute('data-idx'), 10)); };
	});
	document.querySelectorAll('.tftpboot-bulk-num').forEach(function (inp) {
		tftpboot_bind_dial_number_input(inp);
		tftpboot_bulk_bind_lookup(inp, 'number');
	});
	document.querySelectorAll('.tftpboot-bulk-title').forEach(function (inp) {
		inp.addEventListener('input', function () { inp.classList.remove('tftpboot-field-error'); });
		tftpboot_bulk_bind_lookup(inp, 'name');
	});
	if (typeof pb_hint_init === 'function') {
		pb_hint_init(tb);
	}
}

function tftpboot_bulk_delete_one(idx) {
	var r = tftpboot_state.bulkRows[idx];
	if (!r) return;
	if (tftpboot_bulk_row_fixed(r)) {
		var blockDel = (tftpboot_state.labels && tftpboot_state.labels.bulkFixedBlockDelete)
			? tftpboot_state.labels.bulkFixedBlockDelete
			: 'Locked';
		f_notify(blockDel, 'error');
		return;
	}
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
	if (tftpboot_bulk_row_fixed(r)) {
		var blockSave = (tftpboot_state.labels && tftpboot_state.labels.bulkFixedBlockSave)
			? tftpboot_state.labels.bulkFixedBlockSave
			: 'Locked';
		f_notify(blockSave, 'error');
		return;
	}
	var saveBtn = document.querySelector('.tftpboot-bulk-one[data-idx="' + idx + '"]');
	tftpboot_bulk_btn_anim(saveBtn, 'tftpboot-bulk-save-anim');
	var numEl = document.querySelector('.tftpboot-bulk-num[data-idx="' + idx + '"]');
	var titEl = document.querySelector('.tftpboot-bulk-title[data-idx="' + idx + '"]');
	var number = tftpboot_sanitize_dial_number(numEl ? numEl.value : r.number);
	var title = titEl ? titEl.value : r.title;
	var err = tftpboot_validate_dial_pair_detail(title, number, '');
	if (err) {
		tftpboot_show_dial_pair_error(null, err.code, err.message, idx);
		return;
	}
	var item = {
		old_number: r.old_number || r.number,
		old_title: r.old_title !== undefined ? r.old_title : r.title,
		number: number,
		title: title
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
	if (tftpboot_state.syncPreviewInFlight) return;
	var vendors = tftpboot_selected_sync_vendors();
	if (!vendors.length) {
		var msg = (typeof LL === 'object' && LL && LL.TftpBootBulkNoVendors) ? LL.TftpBootBulkNoVendors : 'Select vendors';
		f_notify(msg, 'error');
		return;
	}
	if (tftpboot_state.syncWarmInFlight) {
		var loading = document.getElementById('loading');
		if (loading) loading.style.display = 'block';
		tftpboot_sync_set_preview_busy(true);
		tftpboot_state.syncPreviewQueued = true;
		return;
	}
	if (!tftpboot_state.syncWarmDone) {
		var loadingW = document.getElementById('loading');
		if (loadingW) loadingW.style.display = 'block';
		tftpboot_sync_set_preview_busy(true);
		tftpboot_state.syncPreviewQueued = true;
		tftpboot_sync_warm();
		return;
	}
	tftpboot_sync_preview_run(0);
}

function tftpboot_sync_preview_run(retryCount) {
	var box = document.getElementById('tftpboot-sync-diff');
	var applyBtn = document.getElementById('tftpboot-sync-apply');
	if (box) box.innerHTML = '';
	if (applyBtn) applyBtn.style.display = 'none';
	var loading = document.getElementById('loading');
	if (loading) loading.style.display = 'block';
	var vendors = tftpboot_selected_sync_vendors();
	if (!vendors.length) {
		if (loading) loading.style.display = 'none';
		tftpboot_sync_set_preview_busy(false);
		tftpboot_state.syncPreviewInFlight = false;
		return;
	}
	tftpboot_state.syncPreviewInFlight = true;
	tftpboot_sync_set_preview_busy(true);
	tftpboot_http_long('tftpboot_sync_preview', { vendors: vendors }, function (res) {
		if ((!res || res.code) && retryCount < 1 && tftpboot_http_is_timeout(res)) {
			tftpboot_sync_warm(function () {
				tftpboot_sync_preview_run(retryCount + 1);
			});
			return;
		}
		tftpboot_state.syncPreviewInFlight = false;
		tftpboot_sync_set_preview_busy(false);
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
