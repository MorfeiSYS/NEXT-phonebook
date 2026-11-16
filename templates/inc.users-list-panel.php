<?php
/**
 * $panel_kind: 'local' | 'domain'
 * $panel_users: rows
 * $show_add: bool
 */
if(!isset($panel_users)) { $panel_users = array(); }
$panel_kind = isset($panel_kind) ? $panel_kind : 'local';
$show_add = !empty($show_add);
?>
<div class="users-list-panel" data-users-kind="<?php eh($panel_kind); ?>">
	<div class="users-list-toolbar">
		<input type="search" class="users-list-search" autocomplete="off" placeholder="<?php eh(LL('UsersSearchPlaceholder')); ?>" />
		<span class="users-list-meta" aria-live="polite"></span>
	</div>
	<?php if($show_add) { ?>
	<span class="users-list-add command" onclick="f_show_form('<?php ln('user_get/0') ?>');"><?php L('AddUser') ?></span>
	<?php } ?>

	<div class="users-list-table-wrap">
		<table class="users-list-table main-table" width="100%">
			<thead>
			<tr>
				<th class="users-sort-th users-sort-th-active" data-sort="id" tabindex="0" aria-sort="ascending">ID<span class="users-sort-ind" aria-hidden="true"></span></th>
				<th class="users-sort-th" data-sort="login" tabindex="0" aria-sort="none"><?php L('Login') ?><span class="users-sort-ind" aria-hidden="true"></span></th>
				<th class="users-sort-th" data-sort="mail" tabindex="0" aria-sort="none"><?php L('Mail') ?><span class="users-sort-ind" aria-hidden="true"></span></th>
				<th class="users-sort-th" data-sort="role" tabindex="0" aria-sort="none"><?php L('Role') ?><span class="users-sort-ind" aria-hidden="true"></span></th>
				<th class="users-sort-th" data-sort="status" tabindex="0" aria-sort="none"><?php L('Status') ?><span class="users-sort-ind" aria-hidden="true"></span></th>
				<th><?php L('Operations') ?></th>
			</tr>
			</thead>
			<tbody>
			<?php foreach($panel_users as &$row) {
				$disabled = (intval($row['flags']) & UA_DISABLED) != 0;
				$role_val = intval(@$row['role']);
			?>
				<tr class="users-data-row<?php echo $disabled ? ' users-row-disabled' : ''; ?>"
					id="<?php eh($panel_kind === 'domain' ? 'row-domain'.$row['id'] : 'row'.$row['id']); ?>"
					data-id="<?php eh($row['id']); ?>"
					data-sort-id="<?php eh(intval($row['id'])); ?>"
					data-sort-login="<?php eh(strtolower((string) $row['login'])); ?>"
					data-sort-mail="<?php eh(strtolower((string) $row['mail'])); ?>"
					data-sort-role="<?php eh($role_val); ?>"
					data-sort-status="<?php echo $disabled ? '1' : '0'; ?>"
					data-search="<?php eh(users_row_search_blob($row)); ?>">
					<td class="users-cell-id"><?php eh($row['id']); ?></td>
					<td class="users-cell-login"><?php eh($row['login']); ?></td>
					<td class="users-cell-mail"><?php eh($row['mail']); ?></td>
					<td><?php eh(role_label($role_val)); ?></td>
					<td><span class="users-status-badge users-status-<?php echo $disabled ? 'blocked' : 'active'; ?>"><?php eh(user_status_label($row['flags'])); ?></span></td>
					<td class="users-cell-ops">
						<div class="users-ops-group">
						<?php if($panel_kind === 'local') { ?>
							<span class="command" onclick="f_show_form('<?php ln('user_get/'.$row['id']) ?>');"><?php L('Edit') ?></span>
							<span class="command" onclick="f_show_form('<?php ln('user_password_form/'.$row['id']) ?>');"><?php L('SetUserPassword') ?></span>
						<?php } else { ?>
							<span class="command" onclick="f_show_form('<?php ln('user_ldap_get/'.$row['id']) ?>');"><?php L('Edit') ?></span>
						<?php } ?>
						<?php if($disabled) { ?>
							<span class="command users-toggle-state" onclick="f_activate_user(event);"><?php L('Activate') ?></span>
						<?php } else { ?>
							<span class="command users-toggle-state users-ops-warn" onclick="f_deactivate_user(event);"><?php L('Deactivate') ?></span>
						<?php } ?>
						</div>
					</td>
				</tr>
			<?php } ?>
			</tbody>
		</table>
	</div>
	<div class="users-list-pager">
		<button type="button" class="button-other users-pager-prev" disabled aria-label="<?php eh(LL('UsersPagePrev')); ?>">&#8249;</button>
		<span class="users-pager-label"></span>
		<button type="button" class="button-other users-pager-next" aria-label="<?php eh(LL('UsersPageNext')); ?>">&#8250;</button>
	</div>
</div>