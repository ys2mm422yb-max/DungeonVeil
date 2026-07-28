update private.world_boss_definitions
set balance_season = 'equipment-v4-s1',
    presentation = presentation || jsonb_build_object(
      'rotationContract', 'worldboss-rotation-v1'
    );

update public.world_boss_events
set balance_season = 'equipment-v4-s1',
    presentation = presentation || jsonb_build_object(
      'rotationContract', 'worldboss-rotation-v1'
    ),
    updated_at = clock_timestamp()
where rotation_key is not null;
