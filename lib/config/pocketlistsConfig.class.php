<?php

class pocketlistsConfig extends waAppConfig
{
    /**
     * @var
     */
    protected $factories;

    /**
     * @param $factory
     *
     * @return pocketlistsFactoryItemLink
     * @throws waException
     */
    public function getModelFactory($factory)
    {
        if (isset($this->factories[$factory])) {
            return $this->factories[$factory];
        }

        $factoryClass = sprintf('pocketlistsFactory%s', $factory);

        if (!class_exists($factoryClass) ) {
            throw new waException(sprintf('No factory class for %s', $factory));
        }

        $this->factories[$factory] = new $factoryClass();

        return $this->factories[$factory];
    }

    public function init()
    {
        parent::init();

        $customClasses = [
            'wa-apps/pocketlists/lib/vendor/km/' => [
                'kmStorage',
                'kmModelExt',
                'kmModelStorage',
                'kmStatistics',
            ],
        ];

        foreach ($customClasses as $path => $classes) {
            foreach ($classes as $class) {
                $file = wa()->getAppPath('lib/vendor/km/'.$class.'.class.php', 'pocketlists');
                if (!class_exists($class, false) && file_exists($file)) {
                    waAutoload::getInstance()->add($class, $path.$class.'.class.php');
                }
            }
        }
    }

    public function onInit()
    {
        $wa = wa();
        $id = $wa->getUser()->getId();
        if ($id && ($wa->getApp() == 'pocketlists') && ($wa->getEnv() == 'backend')) {
            $this->setCount($this->onCount());
        }
    }

    public function onCount()
    {
        $pi = new pocketlistsItemModel();

        return $pi->getAppCountForUser();
    }

    public function checkRights($module, $action)
    {
        return true;
    }

    public function explainLogs($logs)
    {
        $log_action = new pocketlistsLogAction();
        $logs = $log_action->explainLogs($logs);

        return $logs;
    }

    public function getCronJob($name = null)
    {
        static $tasks;
        if (!isset($tasks)) {
            $tasks = [];
            $path = $this->getAppConfigPath('cron');
            if (file_exists($path)) {
                $tasks = include($path);
            } else {
                $tasks = [];
            }
        }

        return $name ? (isset($tasks[$name]) ? $tasks[$name] : null) : $tasks;
    }

    public function getLinkedApps()
    {
        return ['shop'];
    }
}
