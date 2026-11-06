<?php include(TEMPLATES_DIR.'tpl.header.php'); ?>
		<?php
		// Defensive defaults: route normally sets these; avoids notices if the template is included alone or partially.
		if(!isset($map_id))
		{
			$map_id = 1;
		}
		$map_id = intval($map_id);

		if(!isset($g_maps_count))
		{
			global $g_maps_count;
			if(!isset($g_maps_count))
			{
				$g_maps_count = 0;
			}
		}
		$g_maps_count = intval($g_maps_count);

		if(!isset($g_maps_catalog))
		{
			global $g_maps_catalog;
			if(!isset($g_maps_catalog) || !is_array($g_maps_catalog))
			{
				$g_maps_catalog = array('categories' => array(), 'byId' => array(), 'flat' => array());
			}
		}

		if(!isset($map_image_src))
		{
			$map_image_src = 'photos/map'.$map_id.'.png';
		}
		if(!isset($contacts) || !is_array($contacts))
		{
			$contacts = array();
		}

		global $g_icons;
		$map_icon_max_idx = 0;
		if(isset($g_icons) && is_array($g_icons) && count($g_icons) > 0)
		{
			$map_icon_max_idx = count($g_icons) - 1;
		}
		?>
		<script>
			map = <?php eh($map_id);?>;
			map_count = <?php eh($g_maps_count);?>;
		</script>
		<h3 align="center"><?php L('Map') ?> <?php maps_catalog_echo_page_heading_links($g_maps_catalog); ?></h3>
		<div style="position: relative;">
				<img id="map-image-drag" src="<?php ls($map_image_src) ?>" style="left: 0px; top: 0px;"/>
		<?php $map_can_drag = $core->UserAuth->check_permission(0, PB_ACCESS_OPERATOR); foreach($contacts as $row) {
			$cid = intval(isset($row['id']) ? $row['id'] : 0);
			if($cid < 1)
			{
				continue;
			}
			$mx = intval(isset($row['x']) ? $row['x'] : 0);
			$my = intval(isset($row['y']) ? $row['y'] : 0);
			$mtype = intval(isset($row['type']) ? $row['type'] : 0);
			if($mtype < 0)
			{
				$mtype = 0;
			}
			if($mtype > $map_icon_max_idx)
			{
				$mtype = $map_icon_max_idx;
			}

			$marker_rel = 'templates/marker-static-'.$mtype.'.png';
			if(!is_file(ROOT_DIR.$marker_rel))
			{
				$found = '';
				for($__i = 0; $__i <= $map_icon_max_idx; $__i++)
				{
					$__cand = 'templates/marker-static-'.$__i.'.png';
					if(is_file(ROOT_DIR.$__cand))
					{
						$found = $__cand;
						break;
					}
				}
				$marker_rel = $found !== '' ? $found : 'templates/marker.gif';
			}
		 ?>
				<img id="<?php eh('u'.$cid);?>" class="mm" src="<?php ls($marker_rel) ?>" data-id="<?php eh($cid);?>" data-name="<?php eh(trim((isset($row['first_name']) ? $row['first_name'] : '').' '.(isset($row['last_name']) ? $row['last_name'] : ''))); ?>" data-position="<?php eh(isset($row['position']) ? $row['position'] : ''); ?>" data-phone="<?php eh(isset($row['phone_internal']) ? $row['phone_internal'] : ''); ?>" data-flags="<?php eh(isset($row['flags']) ? $row['flags'] : 0); ?>" style="position: absolute; <?php eh('left: '.($mx - 16).'px; top: '.($my - 22).'px'); ?><?php if(!$map_can_drag) { ?>; cursor: default<?php } ?>" onmouseenter="si(event)" onmouseleave="document.getElementById('popup').style.display='none'" onmousemove="mi(event);"<?php if($map_can_drag) { ?> onmousedown="f_drag(event);"<?php } ?> ondragstart="return false;"/>
		<?php } ?>
		</div>
		<?php if($core->UserAuth->check_permission(0, PB_ACCESS_ADMIN)) { ?><small><a href="#" onclick="f_map_image(<?php eh(intval($map_id)); ?>); return false;"><?php L('ReplaceMapImage') ?></a></small><?php } ?>
		<div id="popup" class="tooltip-user" style="display: none;">
			<img id="u_photo"/>
			<span id="u_name" class="boldtext"></span><br />
			<span id="u_position"></span><br />
			tel.&nbsp;<span id="u_phone"></span>
		</div>

<?php include(TEMPLATES_DIR.'tpl.universal-form.php'); ?>
<?php include(TEMPLATES_DIR.'tpl.form-upload.php'); ?>
<?php include(TEMPLATES_DIR.'tpl.map-container.php'); ?>
<?php include(TEMPLATES_DIR.'tpl.menu-contact.php'); ?>

		<script>
			document.addEventListener('contextmenu',function(ev) {
				var el_src = ev.target || ev.srcElement;
				if(!el_src || !el_src.classList || !el_src.classList.contains('mm'))
				{
					return;
				}
				ev.preventDefault();
			}, false);
		</script>
<?php include(TEMPLATES_DIR.'tpl.footer.php'); ?>
