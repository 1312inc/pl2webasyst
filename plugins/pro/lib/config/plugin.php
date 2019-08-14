<?php
return [
    'name'     => 'Pocket Lists PRO',
    'img'      => 'img/pl2pro.png',
    'version'  => '1.0.0',
    'vendor'   => '--',
    'handlers' =>
        [
            '*'                => [
                [
                    'event_app_id' => 'pocketlists',
                    'event'        => 'entity_insert.before',
                    'class'        => 'pocketlistsProPluginWaEventListener',
                    'method'       => 'onEntityInsertBefore',
                ],
                [
                    'event_app_id' => 'pocketlists',
                    'event'        => 'entity_update.before',
                    'class'        => 'pocketlistsProPluginWaEventListener',
                    'method'       => 'onEntityUpdateBefore',
                ],
            ],
            'backend_head'     => 'backendHeadHandler',
            'backend_settings' => 'backendSettingsHandler',
            'backend_sidebar'  => 'backendSidebarHandler',
            'backend_pocket'   => 'backendPocketHandler',
            'backend_item_add' => 'backendItemAddHandler',
        ],
];
