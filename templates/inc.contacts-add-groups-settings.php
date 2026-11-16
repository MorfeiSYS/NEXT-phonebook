<?php if(!defined('Z_PROTECTED')) exit; ?>
<?php
if(!isset($contacts_add_allowed_groups)) { $contacts_add_allowed_groups = array(); }
if(!isset($contacts_access_group_dns)) { $contacts_access_group_dns = array(); }
if(!isset($contacts_add_groups_extra)) { $contacts_add_groups_extra = array(); }
?>
<div class="settings-contacts-add-groups">
	<h4><?php L('ContactsAddGroupsTitle') ?></h4>
	<p class="settings-card-desc"><?php L('ContactsAddGroupsDesc') ?></p>
	<?php if(count($contacts_access_group_dns)) { ?>
		<div class="settings-contacts-group-list">
		<?php foreach($contacts_access_group_dns as &$grow) {
			$dn = $grow['dn'];
			$group_label = $dn;
			if(preg_match('/^..=([^,]+),/i', $dn, $matches))
			{
				$group_label = $matches[1];
			}
			$checked = in_array($dn, $contacts_add_allowed_groups, TRUE);
		?>
			<label class="settings-contacts-group-item"><input type="checkbox" name="contacts_add_group" value="<?php eh($dn); ?>"<?php if($checked) echo ' checked'; ?> /> <?php eh($group_label); ?></label>
		<?php } unset($grow); ?>
		</div>
	<?php } else { ?>
		<p class="settings-card-desc"><?php L('ContactsAddGroupsNoAccessDn') ?></p>
	<?php } ?>
	<label class="settings-contacts-extra-label"><?php L('ContactsAddGroupsExtra') ?></label>
	<textarea name="contacts_add_groups_extra" class="settings-contacts-extra-dns" rows="3" placeholder="CN=Group,OU=...,DC=..."><?php eh(implode("\n", $contacts_add_groups_extra)); ?></textarea>
</div>