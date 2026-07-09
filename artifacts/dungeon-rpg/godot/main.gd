extends Node3D

const RANGER_SCENE := "res://public/assets/kaykit/adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Ranger.glb"
const FLOOR_SCENE := "res://public/assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/floor_tile_large.gltf"
const WALL_SCENE := "res://public/assets/kaykit/dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/barrier.gltf"

@export var move_speed := 5.2
@export var dash_distance := 2.4
@export var dash_cooldown := 0.85

var ranger: Node3D
var move_vector := Vector2.ZERO
var touch_origin := Vector2.ZERO
var move_touch_id := -1
var dash_ready := true
var dash_timer := 0.0
var fps_label: Label
var status_label: Label

func _ready() -> void:
	_build_world()
	_build_room()
	_spawn_ranger()
	_build_hud()

func _process(delta: float) -> void:
	if ranger == null:
		return
	_dash_tick(delta)
	var keyboard := Vector2(
		float(Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT)) - float(Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT)),
		float(Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN)) - float(Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP))
	)
	var direction := move_vector if move_vector.length() > 0.05 else keyboard
	if direction.length() > 1.0:
		direction = direction.normalized()
	if direction.length() > 0.05:
		ranger.position += Vector3(direction.x, 0.0, direction.y) * move_speed * delta
		ranger.rotation.y = lerp_angle(ranger.rotation.y, atan2(direction.x, direction.y), min(1.0, delta * 12.0))
		ranger.position.x = clampf(ranger.position.x, -9.2, 9.2)
		ranger.position.z = clampf(ranger.position.z, -12.4, 12.4)
	fps_label.text = "XOGOT NATIVE  ·  %d FPS" % Engine.get_frames_per_second()
	status_label.text = "KayKit Ranger · Touch links bewegen · Rechts tippen = Dash%s" % ("" if dash_ready else " · lädt")

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed:
			if event.position.x < get_viewport().get_visible_rect().size.x * 0.56 and move_touch_id == -1:
				move_touch_id = event.index
				touch_origin = event.position
				move_vector = Vector2.ZERO
			elif event.position.x >= get_viewport().get_visible_rect().size.x * 0.56:
				_dash()
		elif event.index == move_touch_id:
			move_touch_id = -1
			move_vector = Vector2.ZERO
	elif event is InputEventScreenDrag and event.index == move_touch_id:
		var delta := event.position - touch_origin
		move_vector = delta / 120.0
		if move_vector.length() > 1.0:
			move_vector = move_vector.normalized()
	elif event is InputEventKey and event.pressed and event.keycode == KEY_SPACE:
		_dash()

func _dash_tick(delta: float) -> void:
	if dash_ready:
		return
	dash_timer -= delta
	if dash_timer <= 0.0:
		dash_ready = true

func _dash() -> void:
	if not dash_ready or ranger == null:
		return
	var direction := move_vector.normalized()
	if direction.length() < 0.05:
		direction = Vector2(sin(ranger.rotation.y), cos(ranger.rotation.y))
	ranger.position += Vector3(direction.x, 0.0, direction.y) * dash_distance
	ranger.position.x = clampf(ranger.position.x, -9.2, 9.2)
	ranger.position.z = clampf(ranger.position.z, -12.4, 12.4)
	dash_ready = false
	dash_timer = dash_cooldown

func _spawn_ranger() -> void:
	var resource := load(RANGER_SCENE)
	if resource is PackedScene:
		ranger = resource.instantiate() as Node3D
		ranger.name = "KayKitRanger"
		ranger.scale = Vector3.ONE * 1.05
		ranger.position = Vector3(0.0, 0.0, 7.5)
		add_child(ranger)
	else:
		push_error("Dungeon Veil Xogot: Ranger konnte nicht geladen werden: %s" % RANGER_SCENE)

func _build_room() -> void:
	var floor_resource := load(FLOOR_SCENE)
	if floor_resource is PackedScene:
		for z in range(-3, 4):
			for x in range(-2, 3):
				var tile := floor_resource.instantiate() as Node3D
				tile.position = Vector3(float(x) * 4.0, 0.0, float(z) * 4.0)
				if (x + z) % 2 != 0:
					tile.rotation.y = PI * 0.5
				add_child(tile)
	var wall_resource := load(WALL_SCENE)
	if wall_resource is PackedScene:
		for x in range(-5, 6):
			_add_wall(wall_resource, Vector3(float(x) * 2.0, 0.0, -14.0), 0.0)
			_add_wall(wall_resource, Vector3(float(x) * 2.0, 0.0, 14.0), PI)
		for z in range(-6, 7):
			_add_wall(wall_resource, Vector3(-10.0, 0.0, float(z) * 2.0), PI * 0.5)
			_add_wall(wall_resource, Vector3(10.0, 0.0, float(z) * 2.0), -PI * 0.5)

func _add_wall(resource: PackedScene, position_value: Vector3, rotation_value: float) -> void:
	var wall := resource.instantiate() as Node3D
	wall.position = position_value
	wall.rotation.y = rotation_value
	add_child(wall)

func _build_world() -> void:
	var environment := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("151217")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("cfb68e")
	env.ambient_light_energy = 0.72
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	environment.environment = env
	add_child(environment)

	var key_light := DirectionalLight3D.new()
	key_light.rotation_degrees = Vector3(-58.0, -24.0, 0.0)
	key_light.light_color = Color("ffd7a0")
	key_light.light_energy = 1.45
	key_light.shadow_enabled = false
	add_child(key_light)

	var camera := Camera3D.new()
	camera.position = Vector3(0.0, 19.5, 14.5)
	camera.rotation_degrees = Vector3(-48.0, 0.0, 0.0)
	camera.fov = 42.0
	camera.current = true
	add_child(camera)

func _build_hud() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	var panel := ColorRect.new()
	panel.color = Color(0.025, 0.02, 0.03, 0.78)
	panel.position = Vector2(34.0, 70.0)
	panel.size = Vector2(860.0, 160.0)
	layer.add_child(panel)

	var title := Label.new()
	title.text = "DUNGEON VEIL · XOGOT PORT"
	title.position = Vector2(62.0, 88.0)
	title.add_theme_font_size_override("font_size", 34)
	layer.add_child(title)

	fps_label = Label.new()
	fps_label.position = Vector2(62.0, 142.0)
	fps_label.add_theme_font_size_override("font_size", 24)
	layer.add_child(fps_label)

	status_label = Label.new()
	status_label.position = Vector2(62.0, 195.0)
	status_label.add_theme_font_size_override("font_size", 20)
	status_label.modulate = Color("d7c8eb")
	layer.add_child(status_label)

	var move_hint := Label.new()
	move_hint.text = "◉"
	move_hint.position = Vector2(100.0, 2190.0)
	move_hint.add_theme_font_size_override("font_size", 210)
	move_hint.modulate = Color(0.65, 0.55, 0.8, 0.28)
	layer.add_child(move_hint)

	var dash_hint := Label.new()
	dash_hint.text = "DASH"
	dash_hint.position = Vector2(880.0, 2250.0)
	dash_hint.add_theme_font_size_override("font_size", 42)
	dash_hint.modulate = Color("e8c87d")
	layer.add_child(dash_hint)
