<?php

/**
 * Class pocketlistsAppLinkFake
 */
class pocketlistsAppLinkFake implements pocketlistsAppLinkInterface
{
    /**
     * @return string
     */
    public function getApp()
    {
        return 'fake';
    }

    /**
     * @return array
     */
    public function getTypes()
    {
        return [];
    }

    /**
     * @param string $term
     * @param int    $count
     *
     * @return array
     */
    public function autocomplete($term, $type = '', $count = 10)
    {
        return [];
    }

    /**
     * @param pocketlistsItemLinkModel $model
     *
     * @return pocketlistsAppLinkInterface
     */
    public function setItemLinkModel(pocketlistsItemLinkModel $model)
    {}

    /**
     * @param pocketlistsItemLink $itemLink
     *
     * @return string
     */
    public function getLinkUrl(pocketlistsItemLink $itemLink)
    {
        return '';
    }

    /**
     * @param pocketlistsItemLink $itemLink
     *
     * @return waModel
     */
    public function getAppEntity(pocketlistsItemLink $itemLink)
    {
        return null;
    }

    /**
     * @param pocketlistsItemLink $itemLink
     *
     * @return array
     * @throws waException
     */
    public function getExtraData(pocketlistsItemLink $itemLink)
    {
        return [];
    }

    /**
     * @return array
     */
    public function getLinkRegexs()
    {
        return [];
    }

    /**
     * @return string
     */
    public function getAppIcon()
    {
        return '';
    }

    /**
     * @return string
     */
    public function getName()
    {
        return '';
    }

    /**
     * @return int
     */
    public function countItems()
    {
        return 0;
    }

    /**
     * @return bool
     */
    public function isEnabled()
    {
        return false;
    }

    /**
     * @return string
     */
    public function getBannerHtml()
    {
        return '';
    }

    /**
     * @param pocketlistsUser|null $user
     *
     * @return bool
     */
    public function userCanAccess(pocketlistsUser $user = null)
    {
        return false;
    }

    /**
     * @param pocketlistsItemLink $itemLink
     *
     * @return string
     */
    public function renderPreview(pocketlistsItemLink $itemLink)
    {
        return '';
    }

    /**
     * @param pocketlistsItemLink $itemLink
     *
     * @return string
     */
    public function renderAutocomplete(pocketlistsItemLink $itemLink)
    {
        return '';
    }
}