<?php include(TEMPLATES_DIR.'tpl.header.php'); ?>
<?php
if(!isset($tftpboot_enabled_editor)) { $tftpboot_enabled_editor = array(); }
if(!isset($tftpboot_enabled_bulk)) { $tftpboot_enabled_bulk = array(); }
if(!isset($tftpboot_unknown)) { $tftpboot_unknown = array(); }
if(!isset($tftpboot_policies)) { $tftpboot_policies = array(); }
if(!isset($tftpboot_catalog)) { $tftpboot_catalog = array('vendors' => array()); }
if(!isset($tftpboot_settings))
{
	$tftpboot_settings = array(
		'sync_source' => 'phonebook',
		'sync_api_url' => '',
		'sync_api_key' => '',
		'sync_custom_url' => '',
		'sync_auto' => '0',
		'sync_auto_interval' => '60',
		'sync_fields' => 'dss_title,display_name',
		'scan_cache_ttl' => '300',
		'sync_cron_key' => '',
	);
}
?>
<script src="<?php ls('tftpboot.js') ?>"></script>

<h3><?php L('TftpBootAdmin') ?></h3>
<p><a href="<?php ln('tftpboot') ?>"><?php L('TftpBootTitle') ?></a></p>

<form id="tftpboot-admin-form" onsubmit="return tftpboot_admin_save(this);">
	<h4><?php L('TftpBootVendorEnable') ?></h4>
	<?php
	$all_vendors = array('fanvil', 'cisco', 'yealink', 'grandstream', 'eltex', 'unknown');
	foreach($all_vendors as $vid) {
		$ed = in_array($vid, $tftpboot_enabled_editor, TRUE);
		$bu = in_array($vid, $tftpboot_enabled_bulk, TRUE);
		echo '<label><input type="checkbox" name="editor_vendors[]" value="'.htmlspecialchars($vid).'"'.($ed ? ' checked' : '').' /> '.htmlspecialchars($vid).' ('.LL('TftpBootEditor').')</label> ';
		echo '<label><input type="checkbox" name="bulk_vendors[]" value="'.htmlspecialchars($vid).'"'.($bu ? ' checked' : '').' /> '.htmlspecialchars($vid).' ('.LL('TftpBootBulk').')</label><br />';
	}
	?>

	<h4><?php L('TftpBootSyncSettings') ?></h4>
	<label><?php L('TftpBootSyncSource') ?>
		<select name="sync_source">
			<option value="phonebook"<?php if($tftpboot_settings['sync_source'] === 'phonebook') echo ' selected'; ?>><?php L('TftpBootSourcePhonebook') ?></option>
			<option value="api"<?php if($tftpboot_settings['sync_source'] === 'api') echo ' selected'; ?>><?php L('TftpBootSourceApi') ?></option>
			<option value="custom_url"<?php if($tftpboot_settings['sync_source'] === 'custom_url') echo ' selected'; ?>><?php L('TftpBootSourceCustom') ?></option>
		</select>
	</label><br />
	<label>API URL <input type="text" name="sync_api_url" size="60" value="<?php eh($tftpboot_settings['sync_api_url']); ?>" placeholder="{NUMBER} {API_KEY}" /></label><br />
	<label>API KEY <input type="text" name="sync_api_key" size="40" value="<?php eh($tftpboot_settings['sync_api_key']); ?>" /></label><br />
	<label>Custom JSON URL <input type="text" name="sync_custom_url" size="60" value="<?php eh($tftpboot_settings['sync_custom_url']); ?>" /></label><br />
	<label><input type="checkbox" name="sync_auto" value="1"<?php if(intval($tftpboot_settings['sync_auto'])) echo ' checked'; ?> /> <?php L('TftpBootSyncAuto') ?></label>
	<label><?php L('TftpBootSyncInterval') ?> <input type="number" name="sync_auto_interval" value="<?php eh($tftpboot_settings['sync_auto_interval']); ?>" min="5" /></label><br />
	<label><?php L('TftpBootSyncFields') ?> <input type="text" name="sync_fields" value="<?php eh($tftpboot_settings['sync_fields']); ?>" /></label><br />
	<label><?php L('TftpBootScanTtl') ?> <input type="number" name="scan_cache_ttl" value="<?php eh($tftpboot_settings['scan_cache_ttl']); ?>" /></label><br />
	<p><?php L('TftpBootCronUrl') ?>: <code><?php ln('tftpboot_sync_run') ?>?key=<?php eh($tftpboot_settings['sync_cron_key']); ?></code></p>

	<h4><?php L('TftpBootUnknownFiles') ?></h4>
	<table class="tftpboot-table">
		<thead><tr><th>File</th><th>Vendor</th><th>Model</th><th></th></tr></thead>
		<tbody>
		<?php foreach($tftpboot_unknown as $u) { ?>
			<tr>
				<td><?php eh($u['filename']); ?></td>
				<td><input type="text" class="tftpboot-override-vendor" data-file="<?php eh($u['filename']); ?>" value="<?php eh($u['vendor']); ?>" /></td>
				<td><input type="text" class="tftpboot-override-model" data-file="<?php eh($u['filename']); ?>" value="<?php eh($u['model']); ?>" /></td>
				<td><button type="button" class="button-other tftpboot-override-save" data-file="<?php eh($u['filename']); ?>"><?php L('Save') ?></button></td>
			</tr>
		<?php } ?>
		</tbody>
	</table>

	<h4><?php L('TftpBootGroupPolicy') ?></h4>
	<table class="tftpboot-table" id="tftpboot-policies">
		<thead><tr><th>DN</th><th><?php L('TftpBootPolicyMode') ?></th><th><?php L('TftpBootPolicySections') ?></th></tr></thead>
		<tbody>
		<?php foreach($tftpboot_policies as $p) {
			$secs = json_decode($p['allowed_sections_json'], TRUE);
			if(!is_array($secs)) { $secs = array('dss'); }
			?>
			<tr data-sid="<?php eh($p['sid']); ?>">
				<td><?php eh($p['dn']); ?></td>
				<td><?php eh($p['mode']); ?></td>
				<td><?php eh(implode(', ', $secs)); ?></td>
			</tr>
		<?php } ?>
		</tbody>
	</table>
	<div class="tftpboot-policy-new">
		<input type="text" id="tftpboot-policy-dn" placeholder="CN=..." size="50" autocomplete="off" />
		<select id="tftpboot-policy-mode">
			<option value="buttons_only"><?php L('TftpBootModeButtons') ?></option>
			<option value="custom"><?php L('TftpBootModeCustom') ?></option>
			<option value="full"><?php L('TftpBootModeFull') ?></option>
		</select>
		<label><input type="checkbox" class="tftpboot-policy-sec" value="dss" checked /> DSS</label>
		<label><input type="checkbox" class="tftpboot-policy-sec" value="sip" /> SIP</label>
		<label><input type="checkbox" class="tftpboot-policy-sec" value="net" /> NET</label>
		<button type="button" class="button-other" onclick="tftpboot_policy_save()"><?php L('Save') ?></button>
	</div>

	<input type="hidden" name="catalog" id="tftpboot-catalog-json" value="<?php eh(json_encode($tftpboot_catalog, JSON_UNESCAPED_UNICODE)); ?>" />
	<p><button type="submit" class="button-accept"><?php L('Save') ?></button>
	<button type="button" class="button-other" onclick="return tftpboot_rescan_admin()"><?php L('TftpBootRescan') ?></button></p>
</form>

<?php include(TEMPLATES_DIR.'tpl.footer.php'); ?>
