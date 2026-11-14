<?php include(TEMPLATES_DIR.'tpl.header.php'); ?>
<?php
if(!isset($tftpboot_policy))
{
	$tftpboot_policy = array('mode' => 'buttons_only', 'sections' => array('dss'));
}
if(!isset($tftpboot_is_admin))
{
	$tftpboot_is_admin = FALSE;
}
	if(!isset($tftpboot_enabled_bulk))
	{
		$tftpboot_enabled_bulk = array();
	}
	if(!isset($tftpboot_bulk_page_size))
	{
		$tftpboot_bulk_page_size = 50;
	}
?>

<h3><?php L('TftpBootTitle') ?></h3>

<div class="tftpboot-tabs">
	<button type="button" class="tftpboot-tab active" data-tab="pick"><?php L('TftpBootTabPick') ?></button>
	<button type="button" class="tftpboot-tab" data-tab="bulk"><?php L('TftpBootTabBulk') ?></button>
	<button type="button" class="tftpboot-tab" data-tab="sync"><?php L('TftpBootTabSync') ?></button>
</div>

<div id="tftpboot-panel-pick" class="tftpboot-panel">
	<label><?php L('TftpBootVendor') ?>
		<select id="tftpboot-vendor"></select>
	</label>
	<label><?php L('TftpBootModel') ?>
		<select id="tftpboot-model"></select>
	</label>
	<label><?php L('TftpBootPhone') ?>
		<select id="tftpboot-file"></select>
	</label>
	<button type="button" class="button-accept" id="tftpboot-open-btn"><?php L('TftpBootOpenEditor') ?></button>
</div>

<div id="tftpboot-panel-bulk" class="tftpboot-panel" style="display:none">
	<p class="tftpboot-bulk-hint"><?php L('TftpBootBulkHint') ?></p>
	<input type="search" id="tftpboot-bulk-q" placeholder="<?php L('TftpBootSearchPlaceholder') ?>" />
	<div id="tftpboot-bulk-vendors" class="tftpboot-vendor-chks"></div>
	<table class="tftpboot-table" id="tftpboot-bulk-table">
		<thead><tr><th><?php L('TftpBootNumber') ?></th><th><?php L('TftpBootName') ?></th><th><?php L('TftpBootBulkUses') ?></th><th><?php L('TftpBootBulkActions') ?></th></tr></thead>
		<tbody></tbody>
	</table>
	<div id="tftpboot-bulk-pages" class="tftpboot-bulk-pages"></div>
</div>

<div id="tftpboot-panel-sync" class="tftpboot-panel" style="display:none">
	<p class="tftpboot-sync-hint"><?php L('TftpBootSyncHint') ?></p>
	<div id="tftpboot-sync-vendors" class="tftpboot-vendor-chks"></div>
	<div class="tftpboot-sync-actions">
		<button type="button" class="button-other" id="tftpboot-directory-open" title="<?php eh(LL('TftpBootHintDirectory')); ?>"><?php L('TftpBootTabDirectory') ?></button>
		<button type="button" class="button-other" id="tftpboot-directory-refresh"<?php if(empty($tftpboot_sync_api_fetch)) echo ' style="display:none"'; ?> title="<?php eh(LL('TftpBootHintFetchNames')); ?>"><?php L('TftpBootFetchNames') ?></button>
		<button type="button" class="button-other" id="tftpboot-sync-undo"<?php if(empty($tftpboot_sync_has_undo)) echo ' style="display:none"'; ?> title="<?php eh(LL('TftpBootHintSyncUndo')); ?>"><?php L('TftpBootSyncUndo') ?></button>
		<button type="button" class="button-decline" id="tftpboot-sync-apply" style="display:none" title="<?php eh(LL('TftpBootHintApplySync')); ?>"><?php L('TftpBootApplySync') ?></button>
		<button type="button" class="button-accept tftpboot-sync-preview-btn" id="tftpboot-sync-preview" title="<?php eh(LL('TftpBootHintSyncPreview')); ?>"><?php L('TftpBootSyncPreview') ?></button>
	</div>
	<div id="tftpboot-sync-diff"></div>
</div>

<div id="tftpboot-editor" class="modal-container tftpboot-editor-modal" style="display:none">
	<span class="close white" onclick="tftpboot_close_editor()">&times;</span>
	<div class="modal-content tftpboot-editor-content">
		<span class="close" onclick="tftpboot_close_editor()">&times;</span>
		<h3 id="tftpboot-editor-title"></h3>
		<div id="tftpboot-editor-sip" class="tftpboot-section" style="display:none"></div>
		<div id="tftpboot-editor-sections" class="tftpboot-editor-sections"></div>
		<input type="hidden" id="tftpboot-editor-filename" value="" />
		<button type="button" class="button-accept" onclick="tftpboot_save_editor()"><?php L('Save') ?></button>
	</div>
</div>

<div id="tftpboot-directory-modal" class="modal-container" style="display:none">
	<span class="close white" onclick="document.getElementById('tftpboot-directory-modal').style.display='none'">&times;</span>
	<div class="modal-content tftpboot-directory-modal-content">
		<h3><?php L('TftpBootTabDirectory') ?></h3>
		<input type="search" id="tftpboot-directory-q" class="tftpboot-directory-q" placeholder="<?php L('TftpBootSearchPlaceholder') ?>" />
		<div class="tftpboot-directory-scroll">
			<table class="tftpboot-table" id="tftpboot-directory-table"><thead><tr><th><?php L('TftpBootNumber') ?></th><th><?php L('TftpBootName') ?></th></tr></thead><tbody></tbody></table>
		</div>
		<div id="tftpboot-directory-pages" class="tftpboot-bulk-pages"></div>
	</div>
</div>

<script src="<?php ls('tftpboot.js') ?>"></script>
<script>
	tftpboot_init({
		policy: <?php echo json_encode($tftpboot_policy, JSON_UNESCAPED_UNICODE); ?>,
		isAdmin: <?php echo $tftpboot_is_admin ? '1' : '0'; ?>,
		bulkVendors: <?php echo json_encode($tftpboot_enabled_bulk, JSON_UNESCAPED_UNICODE); ?>,
		bulkPageSize: <?php echo intval($tftpboot_bulk_page_size); ?>,
		syncApiFetch: <?php echo !empty($tftpboot_sync_api_fetch) ? '1' : '0'; ?>,
		syncHasUndo: <?php echo !empty($tftpboot_sync_has_undo) ? '1' : '0'; ?>,
		labels: {
			save: <?php echo json_encode(LL('Save'), JSON_UNESCAPED_UNICODE); ?>,
			bulkEmpty: <?php echo json_encode(LL('TftpBootBulkEmpty'), JSON_UNESCAPED_UNICODE); ?>,
			bulkPageInfo: <?php echo json_encode(LL('TftpBootBulkPageInfo'), JSON_UNESCAPED_UNICODE); ?>,
			deleteBtn: <?php echo json_encode(LL('Delete'), JSON_UNESCAPED_UNICODE); ?>,
			bulkDeleteConfirm: <?php echo json_encode(LL('TftpBootBulkDeleteConfirm'), JSON_UNESCAPED_UNICODE); ?>,
			bulkLocHint: <?php echo json_encode(LL('TftpBootBulkLocHint'), JSON_UNESCAPED_UNICODE); ?>,
			syncNoDiff: <?php echo json_encode(LL('TftpBootSyncNoDiff'), JSON_UNESCAPED_UNICODE); ?>,
			syncDiffSummary: <?php echo json_encode(LL('TftpBootSyncDiffSummary'), JSON_UNESCAPED_UNICODE); ?>,
			syncApplyConfirm: <?php echo json_encode(LL('TftpBootSyncApplyConfirm'), JSON_UNESCAPED_UNICODE); ?>,
			syncUndoConfirm: <?php echo json_encode(LL('TftpBootSyncUndoConfirm'), JSON_UNESCAPED_UNICODE); ?>,
			syncConsensusNote: <?php echo json_encode(LL('TftpBootSyncConsensusNote'), JSON_UNESCAPED_UNICODE); ?>,
			catalogNewModelsIntro: <?php echo json_encode(LL('TftpBootNewModelsIntro'), JSON_UNESCAPED_UNICODE); ?>,
			catalogNewModelsLine: <?php echo json_encode(LL('TftpBootNewModelsLine'), JSON_UNESCAPED_UNICODE); ?>,
			catalogModelsAdded: <?php echo json_encode(LL('TftpBootCatalogModelsAdded'), JSON_UNESCAPED_UNICODE); ?>,
			keyClear: <?php echo json_encode(LL('TftpBootKeyClear'), JSON_UNESCAPED_UNICODE); ?>,
			keyPhone: <?php echo json_encode(LL('TftpBootKeyPhone'), JSON_UNESCAPED_UNICODE); ?>,
			editorSidekey: <?php echo json_encode(LL('TftpBootEditorSidekey'), JSON_UNESCAPED_UNICODE); ?>,
			editorSoftdss: <?php echo json_encode(LL('TftpBootEditorSoftdss'), JSON_UNESCAPED_UNICODE); ?>,
			editorDsskey: <?php echo json_encode(LL('TftpBootEditorDsskey'), JSON_UNESCAPED_UNICODE); ?>,
			sipDisplay: <?php echo json_encode(LL('TftpBootSipDisplay'), JSON_UNESCAPED_UNICODE); ?>,
			keyCell: <?php echo json_encode(LL('TftpBootEditorCell'), JSON_UNESCAPED_UNICODE); ?>,
			keyTitle: <?php echo json_encode(LL('TftpBootKeyTitle'), JSON_UNESCAPED_UNICODE); ?>,
			keyNumber: <?php echo json_encode(LL('TftpBootNumber'), JSON_UNESCAPED_UNICODE); ?>,
			fkeyTitleSms: <?php echo json_encode(LL('TftpBootFkeyFSms'), JSON_UNESCAPED_UNICODE); ?>,
			fkeyTitleMwi: <?php echo json_encode(LL('TftpBootFkeyFMwi'), JSON_UNESCAPED_UNICODE); ?>,
			fkeyTitleRecord: <?php echo json_encode(LL('TftpBootFkeyFRecord'), JSON_UNESCAPED_UNICODE); ?>
		}
	});
</script>

<?php include(TEMPLATES_DIR.'tpl.footer.php'); ?>
