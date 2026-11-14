<?php
/**
 * Phonebook list template (included from routes/contacts.php).
 *
 * @var \Core $core
 * @var string $action
 * @var int $offset
 * @var int $sort
 * @var string $search
 * @var int $total
 * @var array<int,array<string,mixed>> $phones
 * @var list<string> $contacts_columns
 * @var bool $contacts_columns_custom
 * @var array<int,array<string,mixed>> $birthdays
 */
include(TEMPLATES_DIR.'tpl.header.php');
?>
		<h2 class="page-heading"><?php L('Phonebook') ?></h2>
		<div>
			<?php if(user_is_operator()) { ?>
				<span class="command f-right" onclick="f_show_form('<?php ln('contact_edit/0') ?>');"><?php L('AddСontact') ?></span>
			<?php } ?>

			<!--<span><b><?php L('Brithdays') ?>:</b></span>
			<?php 
				if($birthdays) {
					foreach($birthdays as &$row) {?>
						<br /><span><b><?php eh($row['DayMonth']); ?></b></span>&nbsp;<span><?php eh($row['last_name'].' '.$row['first_name'].' '.$row['middle_name']); ?></span>
			<?php 
					} 
				} else { ?>
					<span><?php L('NoBirthdays') ?></span>
			<?php 
				}?>
			-->
		</div>

		<div id="imgblock" class="user-photo"><img id="userphoto" src=""/></div>

		<br />
		<script>
			g_contacts_columns = <?php echo json_encode(array_values($contacts_columns)); ?>;
		</script>
		<form id="search_form" action="<?php ln($action.'/search'); ?>" method="get" onsubmit="return f_search(this);">
			<?php L('Find') ?>: <input type="text" id="search" class="form-field" placeholder="<?php L('Search') ?>..." value="<?php if(isset($search)) eh($search); ?>" onkeyup="contacts_search('<?php eh($action); ?>');">
			<input class="button-other" type="submit" value="<?php L('Search') ?>" /><br />
		</form>

		<?php if(user_is_admin()) { ?>
		<div class="contact-status-legend">
			<strong><?php L('ContactStatusLegendTitle'); ?>:</strong>
			<span class="contact-status-legend-item"><span class="contact-status-dot contact-status-dot--ok" aria-hidden="true"></span> <?php L('ContactStatusLegendOk'); ?></span>
			<span class="contact-status-legend-item"><span class="contact-status-dot contact-status-dot--del" aria-hidden="true"></span> <?php L('ContactStatusLegendAdDeleted'); ?></span>
			<span class="contact-status-legend-item"><span class="contact-status-dot contact-status-dot--dis" aria-hidden="true"></span> <?php L('ContactStatusLegendAdDisabled'); ?></span>
			<span class="contact-status-legend-item"><span class="contact-status-dot contact-status-dot--hid" aria-hidden="true"></span> <?php L('ContactStatusLegendListHidden'); ?></span>
			<span class="contact-status-legend-item"><span class="contact-status-dot contact-status-dot--inv" aria-hidden="true"></span> <?php L('ContactStatusLegendNotVisible'); ?></span>
			<span class="contact-status-legend-item"><?php L('ContactStatusLegendMulti'); ?></span>
		</div>
		<?php } ?>

		<table id="table" class="main-table">
			<thead>
			<tr>
				<?php if(user_is_admin()) { ?>
				<th width="1%"><input type="checkbox" onclick="f_select_all(event)"/></th>
				<?php } ?>
				<?php $contacts_column_catalog = contacts_columns_catalog(); foreach($contacts_columns as $column_key) { $column_meta = $contacts_column_catalog[$column_key]; $column_sort = $column_meta['sort']; ?>
				<th width="<?php eh($column_meta['width']); ?>"><a href="<?php ln($action.'/sort/'.($column_sort | ((($sort & 0xFF) == $column_sort && ($sort & 0x0100) == 0)?0x0100:0)).'/offset/'.$offset.'/search/'.urlencode($search)); ?>"><?php L($column_meta['label']); ?></a><?php if(($sort & 0xFF) == $column_sort) { echo ' '.(($sort & 0x0100)?'&#9660;':'&#9650;'); } ?></th>
				<?php } ?>
				<?php if(user_is_admin()) { ?>
				<th width="15%"><?php L('Operations') ?></th>
				<?php } ?>
			</tr>
			</thead>
			<tbody id="table-data">
		<?php $i = 0; foreach($phones as &$row) { $i++; ?>
			<tr id="<?php eh("row".$row['id']);?>" data-id="<?php eh($row['id']); ?>" data-map="<?php eh($row['map']); ?>" data-x="<?php eh($row['x']); ?>" data-y="<?php eh($row['y']); ?>" data-flags="<?php eh($row['flags']); ?>">
				<?php if(user_is_admin()) { ?>
					<td><input type="checkbox" name="check" value="<?php eh($row['id']); ?>"/></td>
				<?php } ?>
				<?php foreach($contacts_columns as $column_key) { echo contacts_column_cell($column_key, $row); } ?>
				<?php if(user_is_admin()) { ?>
					<td>
						<span class="command" onclick="f_menu(event);"><?php L('Menu') ?></span>
					</td>
				<?php } ?>
			</tr>
		<?php } ?>
			</tbody>
		</table>

		<?php if(user_is_admin()) { ?>
		<form id="contacts" method="post" action="<?php ln('contacts_export_selected'); ?>">
			<input id="list" type="hidden" name="list" value="" />
		</form>
		<a href="#" onclick="f_export_selected(event); return false;"><?php L('ExportSelected') ?></a>
		<?php } ?>

		<br />

		<div id="pages">
			<a class="page-number<?php if($offset == 0) eh(' boldtext'); ?>" href="<?php ln($action.'/offset/0/search/'.urlencode($search)); ?>">1</a>
			<?php 
				$min = max(100, $offset - 1000);
				$max = min($offset + 1000, $total - ($total % 100));

				if($min > 100) { echo '&nbsp;...&nbsp;'; }

				for($i = $min; $i <= $max; $i += 100)
				{
				?>
					<a class="page-number<?php if($offset == $i) eh(' boldtext'); ?>" href="<?php ln($action.'/offset/'.$i.'/search/'.urlencode($search)); ?>"><?php eh($i/100 + 1); ?></a>
				<?php
				}

				$max = $total - ($total % 100);
				if($i < $max)
				{
				?>
					&nbsp;...&nbsp;<a class="page-number<?php if($offset == $max) eh(' boldtext'); ?>" href="<?php ln($action.'/offset/'.$max.'/search/'.urlencode($search)); ?>"><?php eh($max/100 + 1); ?></a>
				<?php
				}
			?>
		</div>

		<br />

<?php include(TEMPLATES_DIR.'tpl.universal-form.php'); ?>
<?php include(TEMPLATES_DIR.'tpl.form-upload.php'); ?>
<?php include(TEMPLATES_DIR.'tpl.map-container.php'); ?>
<?php include(TEMPLATES_DIR.'tpl.menu-contact.php'); ?>
<?php include(TEMPLATES_DIR.'tpl.footer.php'); ?>

