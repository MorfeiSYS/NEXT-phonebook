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
?>
<script src="<?php ls('tftpboot.js') ?>"></script>
<script>
	tftpboot_init({
		policy: <?php echo json_encode($tftpboot_policy, JSON_UNESCAPED_UNICODE); ?>,
		isAdmin: <?php echo $tftpboot_is_admin ? '1' : '0'; ?>,
		bulkVendors: <?php echo json_encode($tftpboot_enabled_bulk, JSON_UNESCAPED_UNICODE); ?>
	});
</script>

<h3><?php L('TftpBootTitle') ?></h3>

<div class="tftpboot-tabs">
	<button type="button" class="tftpboot-tab active" data-tab="pick"><?php L('TftpBootTabPick') ?></button>
	<button type="button" class="tftpboot-tab" data-tab="bulk"><?php L('TftpBootTabBulk') ?></button>
	<button type="button" class="tftpboot-tab" data-tab="directory"><?php L('TftpBootTabDirectory') ?></button>
	<button type="button" class="tftpboot-tab" data-tab="sync"><?php L('TftpBootTabSync') ?></button>
	<?php if($tftpboot_is_admin) { ?>
		<a class="tftpboot-tab-link" href="<?php ln('tftpboot_admin') ?>"><?php L('TftpBootAdmin') ?></a>
	<?php } ?>
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
	<input type="search" id="tftpboot-bulk-q" placeholder="<?php L('TftpBootSearchPlaceholder') ?>" />
	<div id="tftpboot-bulk-vendors" class="tftpboot-vendor-chks"></div>
	<button type="button" class="button-other" id="tftpboot-bulk-search"><?php L('Search') ?></button>
	<table class="tftpboot-table" id="tftpboot-bulk-table">
		<thead><tr><th><?php L('TftpBootPhone') ?></th><th><?php L('TftpBootKeySlot') ?></th><th><?php L('TftpBootNumber') ?></th><th><?php L('TftpBootKeyTitle') ?></th><th></th></tr></thead>
		<tbody></tbody>
	</table>
</div>

<div id="tftpboot-panel-directory" class="tftpboot-panel" style="display:none">
	<button type="button" class="button-other" id="tftpboot-directory-open"><?php L('TftpBootTabDirectory') ?></button>
	<button type="button" class="button-other" id="tftpboot-directory-refresh"><?php L('TftpBootFetchNames') ?></button>
</div>

<div id="tftpboot-panel-sync" class="tftpboot-panel" style="display:none">
	<button type="button" class="button-accept" id="tftpboot-sync-preview"><?php L('TftpBootFetchNames') ?></button>
	<button type="button" class="button-accept" id="tftpboot-sync-apply" style="display:none"><?php L('TftpBootApplySync') ?></button>
	<div id="tftpboot-sync-diff"></div>
</div>

<div id="tftpboot-editor" class="modal-container tftpboot-editor-modal" style="display:none">
	<span class="close white" onclick="tftpboot_close_editor()">&times;</span>
	<div class="modal-content tftpboot-editor-content">
		<span class="close" onclick="tftpboot_close_editor()">&times;</span>
		<h3 id="tftpboot-editor-title"></h3>
		<div id="tftpboot-editor-sip" class="tftpboot-section" style="display:none"></div>
		<div id="tftpboot-editor-keys" class="tftpboot-keys-grid"></div>
		<input type="hidden" id="tftpboot-editor-filename" value="" />
		<button type="button" class="button-accept" onclick="tftpboot_save_editor()"><?php L('Save') ?></button>
	</div>
</div>

<div id="tftpboot-directory-modal" class="modal-container" style="display:none">
	<span class="close white" onclick="document.getElementById('tftpboot-directory-modal').style.display='none'">&times;</span>
	<div class="modal-content">
		<h3><?php L('TftpBootTabDirectory') ?></h3>
		<table class="tftpboot-table" id="tftpboot-directory-table"><thead><tr><th><?php L('TftpBootNumber') ?></th><th><?php L('TftpBootName') ?></th></tr></thead><tbody></tbody></table>
	</div>
</div>

<?php include(TEMPLATES_DIR.'tpl.footer.php'); ?>
