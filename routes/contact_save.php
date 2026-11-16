<?php

function contact_save(&$core, $params, $post_data)
{
	global $g_icons;

	$v_id = intval(@$post_data['id']);

	if($v_id)
	{
		assert_permission_ajax(0, PB_ACCESS_ADMIN);
	}
	else
	{
		contact_assert_can_add($core);
	}

	$type_max = is_array($g_icons) ? (count($g_icons) - 1) : 0;
	if($type_max < 0)
	{
		$type_max = 0;
	}

	$result_json = array(
		'code' => 0,
		'message' => '',
		'errors' => array()
	);

	$normalized = array();
	if(!contact_validate_save_data($post_data, $type_max, $normalized, $result_json['errors']))
	{
		$result_json['code'] = 1;
		$result_json['message'] = LL('NotAllFilled');
		echo json_encode($result_json, JSON_UNESCAPED_UNICODE);
		return;
	}

	$v_last_name = $normalized['last_name'];
	$v_first_name = $normalized['first_name'];
	$v_middle_name = $normalized['middle_name'];
	$v_department = $normalized['department'];
	$v_organization = $normalized['organization'];
	$v_position = $normalized['position'];
	$v_phone_internal = $normalized['phone_internal'];
	$v_phone_external = $normalized['phone_external'];
	$v_phone_mobile = $normalized['phone_mobile'];
	$v_mail = $normalized['mail'];
	$v_birthday = $normalized['birthday'];
	$v_type = $normalized['type'];
	$v_reserved1 = '';
	$v_reserved2 = '';
	$v_reserved3 = '';
	$v_reserved4 = '';
	$v_reserved5 = '';

	if($v_birthday !== '')
	{
		$d = explode('.', $v_birthday, 3);
		$nd = intval(@$d[0]);
		$nm = intval(@$d[1]);
		$ny = intval(@$d[2]);
		$v_birthday = sprintf('\'%04d-%02d-%02d\'', $ny, $nm, $nd);

		if(!datecheck($nd, $nm, $ny))
		{
			$result_json['code'] = 1;
			$result_json['errors'][] = array('name' => 'birthday', 'msg' => LL('IncorrectDate').' DD.MM.YYYY');
			$result_json['message'] = LL('NotAllFilled');
			echo json_encode($result_json, JSON_UNESCAPED_UNICODE);
			return;
		}
	}
	else
	{
		$v_birthday = 'NULL';
	}

	if(!$v_id)
	{
		$core->db->put(rpv('
				INSERT INTO `@contacts` (
					`adid`,
					`samaccountname`,
					`last_name`,
					`first_name`,
					`middle_name`,
					`department`,
					`organization`,
					`position`,
					`phone_internal`,
					`phone_external`,
					`phone_mobile`,
					`mail`,
					`birthday`,
					`reserved1`,
					`reserved2`,
					`reserved3`,
					`reserved4`,
					`reserved5`,
					`type`,
					`flags`
				) VALUES (\'\', \'\', {s0}, {s1}, {s2}, {s3}, {s4}, {s5}, {s6}, {s7}, {s8}, {s9}, {r10}, {s11}, {s12}, {s13}, {s14}, {s15}, {d16}, {d17})
			',
			$v_last_name,
			$v_first_name,
			$v_middle_name,
			$v_department,
			$v_organization,
			$v_position,
			$v_phone_internal,
			$v_phone_external,
			$v_phone_mobile,
			$v_mail,
			$v_birthday,
			$v_reserved1,
			$v_reserved2,
			$v_reserved3,
			$v_reserved4,
			$v_reserved5,
			$v_type,
			PB_CONTACT_VISIBLE
		));

		$v_id = $core->db->last_id();

		log_db('Added contact', '{id='.$v_id.',name="'.substr($v_first_name, 0, 200).'"}', 0);

		echo json_encode(array('code' => 0, 'id' => $v_id, 'message' => 'Added (ID '.$v_id.')'), JSON_UNESCAPED_UNICODE);
	}
	else
	{
		$affected = 0;
		if(!$core->db->put(rpv('
				UPDATE `@contacts` SET
					`samaccountname` = \'\',
					`last_name` = {s0},
					`first_name` = {s1},
					`middle_name` = {s2},
					`department` = {s3},
					`organization` = {s4},
					`position` = {s5},
					`phone_internal` = {s6},
					`phone_external` = {s7},
					`phone_mobile` = {s8},
					`mail` = {s9},
					`birthday` = {r10},
					`reserved1` = {s11},
					`reserved2` = {s12},
					`reserved3` = {s13},
					`reserved4` = {s14},
					`reserved5` = {s15},
					`type` = {d16}
				WHERE
					`id` = {d17}
					AND `adid` = \'\'
				LIMIT 1
			',
			$v_last_name,
			$v_first_name,
			$v_middle_name,
			$v_department,
			$v_organization,
			$v_position,
			$v_phone_internal,
			$v_phone_external,
			$v_phone_mobile,
			$v_mail,
			$v_birthday,
			$v_reserved1,
			$v_reserved2,
			$v_reserved3,
			$v_reserved4,
			$v_reserved5,
			$v_type,
			$v_id
		), $affected) || $affected < 1)
		{
			echo json_encode(array('code' => 1, 'message' => LL('Error')), JSON_UNESCAPED_UNICODE);
			return;
		}

		log_db('Updated contact', '{id='.$v_id.',name="'.substr($v_first_name, 0, 200).'"}', 0);

		echo json_encode(array('code' => 0, 'id' => $v_id, 'message' => 'Updated (ID '.$v_id.')'), JSON_UNESCAPED_UNICODE);
	}
}