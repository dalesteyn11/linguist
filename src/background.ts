import { defaultConfig } from './config';

import { ConfigStorage } from './modules/ConfigStorage/ConfigStorage';
import { Background, translatorModules } from './modules/Background';
import { sendConfigUpdateEvent } from './modules/ContentScript';

import { AppThemeControl } from './lib/browser/AppThemeControl';
import { toggleTranslateItemInContextMenu } from './lib/browser/toggleTranslateItemInContextMenu';

import { migrateAll } from './migrations/migrationsList';

import { TextTranslatorStorage } from './layouts/TextTranslator/TextTranslator.utils/TextTranslatorStorage';

// Request handlers
import { updateConfigFactory } from './requests/backend/updateConfig';
import { pingFactory } from './requests/backend/ping';
import { translateFactory } from './requests/backend/translate';
import { suggestLanguageFactory } from './requests/backend/suggestLanguage';
import { getTranslatorFeaturesFactory } from './requests/backend/getTranslatorFeatures';
import { getUserLanguagePreferencesFactory } from './requests/backend/getUserLanguagePreferences';
import { getTranslatorModulesFactory } from './requests/backend/getTranslatorModules';
import { getConfigFactory } from './requests/backend/getConfig';
import { setConfigFactory } from './requests/backend/setConfig';
import { resetConfigFactory } from './requests/backend/resetConfig';
import { clearCacheFactory } from './requests/backend/clearCache';
import { getTTSFactory } from './requests/backend/getTTS';

// Auto translation
import { setSitePreferencesFactory } from './requests/backend/autoTranslation/sitePreferences/setSitePreferences';
import { getSitePreferencesFactory } from './requests/backend/autoTranslation/sitePreferences/getSitePreferences';
import { deleteSitePreferencesFactory } from './requests/backend/autoTranslation/sitePreferences/deleteSitePreferences';
import { getLanguagePreferencesFactory } from './requests/backend/autoTranslation/languagePreferences/getLanguagePreferences';
import { addLanguagePreferencesFactory } from './requests/backend/autoTranslation/languagePreferences/addLanguagePreferences';
import { deleteLanguagePreferencesFactory } from './requests/backend/autoTranslation/languagePreferences/deleteLanguagePreferences';

import { addTranslationFactory } from './requests/backend/translations/addTranslation';
import { findTranslationFactory } from './requests/backend/translations/findTranslation';
import { deleteTranslationFactory } from './requests/backend/translations/deleteTranslation';
import { getTranslationsFactory } from './requests/backend/translations/getTranslations';
import { clearTranslationsFactory } from './requests/backend/translations/clearTranslations';

// Make async context
(async () => {
	// Migrate data
	await migrateAll();

	// Run application
	const cfg = new ConfigStorage(defaultConfig);
	const bg = new Background(cfg);

	//
	// Handle config updates
	//

	// Set icon
	const appThemeControl = new AppThemeControl();
	cfg.onUpdate(
		({ appIcon }) => {
			appThemeControl.setAppIconPreferences(appIcon);
		},
		['appIcon'],
	);

	// Clear cache while disable
	cfg.onUpdate(
		({ scheduler }, prev) => {
			if (scheduler.useCache === false && prev.scheduler.useCache === true) {
				bg.clearTranslatorsCache();
			}
		},
		['scheduler'],
	);

	// Clear TextTranslator state
	cfg.onUpdate(
		({ textTranslator }, prev) => {
			if (
				textTranslator.rememberText === false &&
				prev.textTranslator.rememberText === true
			) {
				// NOTE: it is async operation
				TextTranslatorStorage.forgetText();
			}
		},
		['textTranslator'],
	);

	// TODO: toggle it while switch tabs
	// Configure context menu
	cfg.onUpdate(
		({ selectTranslator: { enabled, mode } }) => {
			const isEnabled = enabled && mode === 'contextMenu';
			toggleTranslateItemInContextMenu(isEnabled);
		},
		['selectTranslator'],
	);

	//
	// Handle first load
	//

	bg.onLoad(async () => {
		// Send update event
		cfg.onUpdate(() => {
			sendConfigUpdateEvent();
		});

		// Set handlers from factories
		const factories = [
			translateFactory,
			suggestLanguageFactory,
			getTranslatorFeaturesFactory,
			getUserLanguagePreferencesFactory,
			getTranslatorModulesFactory,
			clearCacheFactory,
			getTTSFactory,

			getConfigFactory,
			setConfigFactory,
			resetConfigFactory,
			updateConfigFactory,

			getLanguagePreferencesFactory,
			addLanguagePreferencesFactory,
			deleteLanguagePreferencesFactory,
			setSitePreferencesFactory,
			getSitePreferencesFactory,
			deleteSitePreferencesFactory,

			addTranslationFactory,
			deleteTranslationFactory,
			findTranslationFactory,
			getTranslationsFactory,
			clearTranslationsFactory,

			// Up ping last to give success response only when all request handlers is ready
			pingFactory,
		];

		// Prevent run it again on other pages, such as options page
		// NOTE: on options page function `resetConfigFactory` is undefined. How it work?
		const backgroundPagePath = '/_generated_background_page.html';
		if (location.pathname === backgroundPagePath) {
			factories.forEach((factory) => {
				factory({ cfg, bg, translatorModules: translatorModules as any });
			});
		}
	});
})();
