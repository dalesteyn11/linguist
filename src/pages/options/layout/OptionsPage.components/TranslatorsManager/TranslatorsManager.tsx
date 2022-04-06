import React, { FC, useCallback, useContext, useEffect, useState } from 'react';
import { cn } from '@bem-react/classname';

// TODO: move modal to local component
import { Modal } from 'react-elegant-ui/components/Modal/Modal.bundle/desktop';
import { Button } from '../../../../../components/Button/Button.bundle/universal';
import { Icon } from '../../../../../components/Icon/Icon.bundle/desktop';
import { LayoutFlow } from '../../../../../components/LayoutFlow/LayoutFlow';
import { Loader } from '../../../../../components/Loader/Loader';
import { ModalLayout } from '../../../../../components/ModalLayout/ModalLayout';
import { addTranslator } from '../../../../../requests/backend/translators/addTranslator';
import { deleteTranslator } from '../../../../../requests/backend/translators/deleteTranslator';
import { getTranslators } from '../../../../../requests/backend/translators/getTranslators';
import { updateTranslator } from '../../../../../requests/backend/translators/updateTranslator';
import { OptionsModalsContext } from '../../OptionsPage';
import {
	EditedCustomTranslator,
	TranslatorEditor,
} from '../TranslatorEditor/TranslatorEditor';

import './TranslatorsManager.css';

export type CustomTranslator = {
	id: number;
	name: string;
	code: string;
};

const cnTranslatorsManager = cn('TranslatorsManager');

export const TranslatorsManager: FC<{
	visible: boolean;
	onClose: () => void;
}> = ({ visible, onClose }) => {
	const scope = useContext(OptionsModalsContext);

	const [isEditorOpened, setIsEditorOpened] = useState(false);
	const [editedTranslator, setEditedTranslator] = useState<CustomTranslator | null>(
		null,
	);

	const [isLoading, setIsLoading] = useState(true);
	const [translators, setTranslators] = useState<CustomTranslator[]>([]);

	const addNewTranslator = useCallback(() => {
		setEditedTranslator(null);
		setIsEditorOpened(true);
	}, []);

	const updateTranslatorsList = useCallback(
		() =>
			getTranslators().then((translators) => {
				setTranslators(translators.map(({ key: id, data }) => ({ id, ...data })));
			}),
		[],
	);

	const editTranslator = useCallback((translator: CustomTranslator) => {
		setEditedTranslator(translator);
		setIsEditorOpened(true);
	}, []);

	const closeEditor = useCallback(() => {
		setEditedTranslator(null);
		setIsEditorOpened(false);
	}, []);

	const deleteTranslatorWithConfirmation = useCallback(
		(translator: CustomTranslator) => {
			if (!confirm(`Are you sure about removing translator "${translator.name}"?`))
				return;

			deleteTranslator(translator.id).then(() => {
				updateTranslatorsList();
			});
		},
		[updateTranslatorsList],
	);

	const onSave = useCallback(
		async (translator: EditedCustomTranslator) => {
			const { id, name, code } = translator;

			console.warn('onSave', translator);

			if (id === undefined) {
				await addTranslator({ name, code });
			} else {
				const data = { id, translator: { name, code } };
				await updateTranslator(data);
			}

			await updateTranslatorsList();
			closeEditor();
		},
		[closeEditor, updateTranslatorsList],
	);

	useEffect(() => {
		console.warn('Start loading');

		updateTranslatorsList().then(() => {
			console.warn('Loaded');

			setIsLoading(false);
		});
	}, [updateTranslatorsList]);

	return (
		<Modal visible={visible} onClose={onClose} scope={scope} preventBodyScroll>
			{isLoading ? (
				<Loader />
			) : (
				<ModalLayout
					title={'Custom translators list'}
					footer={[
						<Button view="action" onPress={addNewTranslator}>
							Add new
						</Button>,
						<Button onPress={onClose}>Close</Button>,
					]}
				>
					<div className={cnTranslatorsManager({})}>
						{translators.length !== 0
							? undefined
							: 'Custom translate modules is not defined yet'}
						<LayoutFlow direction="vertical" indent="m">
							{translators.map((translatorInfo) => {
								const { id, name } = translatorInfo;

								return (
									<div
										className={cnTranslatorsManager(
											'TranslatorEntry',
										)}
										key={id}
									>
										<span
											className={cnTranslatorsManager(
												'TranslatorEntryName',
											)}
										>
											{name}
										</span>

										<LayoutFlow
											direction="horizontal"
											indent="m"
											className={cnTranslatorsManager(
												'TranslatorEntryControls',
											)}
										>
											<Button
												onPress={() => {
													editTranslator(translatorInfo);
												}}
											>
												Edit
											</Button>
											<Button
												onPress={() => {
													deleteTranslatorWithConfirmation(
														translatorInfo,
													);
												}}
											>
												<Icon glyph="delete" scalable={false} />
											</Button>
										</LayoutFlow>
									</div>
								);
							})}
						</LayoutFlow>
					</div>
				</ModalLayout>
			)}

			{isEditorOpened && (
				<TranslatorEditor
					translator={editedTranslator}
					onClose={closeEditor}
					onSave={onSave}
				/>
			)}
		</Modal>
	);
};