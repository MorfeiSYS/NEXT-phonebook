<?php
if(!isset($logs)) { $logs = array(); }
if(!isset($offset)) { $offset = 0; }
if(!isset($total)) { $total = 0; }
if(!isset($search)) { $search = ''; }
?>
<?php include(TEMPLATES_DIR.'tpl.header.php'); ?>
		<h3 align="center"><?php L('ChangeLog') ?></h3>

		<form id="search_form" action="<?php ln('logs/0'); ?>" method="get" onsubmit="return f_search(this);">
			<?php L('Find') ?>: <input type="text" id="search" class="form-field" placeholder="<?php L('Search') ?>..." value="<?php if(isset($search)) eh($search); ?>">
			<input class="button-other" type="submit" value="<?php L('Search') ?>" /><br />
		</form>

		<table id="table" class="main-table">
			<thead>
			<tr>
				<th width="15%"><?php L('Date') ?></th>
				<th width="15%"><?php L('User') ?></th>
				<th width="20%"><?php L('LogOperation') ?></th>
				<th width="50%"><?php L('LogParams') ?></th>
			</tr>
			</thead>
			<tbody id="table-data">
		<?php $i = 0; if($logs) foreach($logs as &$row) { $i++; ?>
			<tr id="<?php eh("row".$row['id']);?>" data-id=<?php eh($row['id']);?>>
				<td><?php eh($row['date']); ?></td>
				<td><?php
					if(!empty($row['login']))
					{
						eh($row['login']);
					}
					elseif(!empty($row['uid']))
					{
						L('LogUserUnknown');
					}
					else
					{
						echo '—';
					}
				?></td>
				<td><?php eh($row['operation']); ?></td>
				<td><pre class="settings-config-pre"><?php eh($row['params']); ?></pre></td>
			</tr>
		<?php } ?>
			</tbody>
		</table>

		<a class="page-number<?php if($offset == 0) eh(' boldtext'); ?>" href="<?php ln('logs/0/'.urlencode($search)); ?>">1</a>
		<?php
			$min = max(100, $offset - 1000);
			$max = min($offset + 1000, $total - ($total % 100));

			if($min > 100) { echo '&nbsp;...&nbsp;'; }

			for($i = $min; $i <= $max; $i += 100)
			{
			?>
				<a class="page-number<?php if($offset == $i) eh(' boldtext'); ?>" href="<?php ln('logs/'.$i.'/'.urlencode($search)); ?>"><?php eh($i/100 + 1); ?></a>
			<?php
			}

			$max = $total - ($total % 100);
			if($i < $max)
			{
			?>
				&nbsp;...&nbsp;<a class="page-number<?php if($offset == $max) eh(' boldtext'); ?>" href="<?php ln('logs/'.$max.'/'.urlencode($search)); ?>"><?php eh($max/100 + 1); ?></a>
			<?php
			}
		?>

		<br />
		<br />

<?php include(TEMPLATES_DIR.'tpl.footer.php'); ?>