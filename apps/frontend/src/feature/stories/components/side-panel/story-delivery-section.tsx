import { NO_CACHE_SCHEDULE } from '@quarry/shared';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Mail, Send, Slack, Wand2 } from 'lucide-react';
import styles from './story-delivery-section.module.css';
import type { NotificationChannel, RecipientMode } from '@quarry/shared/types';

import { MemberPicker } from '@/components/share-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { useShareAudience } from '@/hooks/use-share-dialog';
import { useSession } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { storyApi } from '@/lib/story-api';

export interface StoryDeliveryHandle {
	save: () => Promise<void>;
}

export interface StoryDeliveryStatus {
	dirty: boolean;
	valid: boolean;
}

interface StoryDeliverySectionProps {
	chatId: string;
	storySlug: string;
	open: boolean;
	refreshCron: string | null;
	onStatusChange: (status: StoryDeliveryStatus) => void;
}

type DeliveryTiming = 'after-refresh' | 'custom-schedule';

const CUSTOM_PRESET = 'custom';
const DEFAULT_PRESET = '0 8 * * *';

const STANDARD_PRESETS: { value: string; label: string }[] = [
	{ value: '0 * * * *', label: 'Every hour' },
	{ value: '0 8 * * *', label: 'Every day at 8am' },
	{ value: '0 8 * * 1', label: 'Every Monday at 8am' },
	{ value: '0 8 1 * *', label: 'Monthly (1st at 8am)' },
];

const SCHEDULE_OPTIONS: { value: string; label: string }[] = [
	...STANDARD_PRESETS,
	{ value: CUSTOM_PRESET, label: 'Custom schedule…' },
];

export const StoryDeliverySection = forwardRef<StoryDeliveryHandle, StoryDeliverySectionProps>(
	function StoryDeliverySection({ chatId, storySlug, open, refreshCron, onStatusChange }, ref) {
		const queryClient = useQueryClient();
		const { data: session } = useSession();
		const currentUserId = session?.user?.id ?? null;
		const delivery = useQuery({ ...storyApi.story.getDelivery.queryOptions({ chatId, storySlug }), enabled: open });
		const recipientsQuery = useQuery({
			...storyApi.story.listDeliveryRecipients.queryOptions({ chatId, storySlug }),
			enabled: open,
		});
		const shareQuery = useQuery({
			...storyApi.storyShare.getSharedStoryInfo.queryOptions({ chatId, storySlug }),
			enabled: open,
		});
		const isShared = shareQuery.data?.isShared === true;
		const audience = useShareAudience();
		const canDeliverToAll = audience.canShareToProject || shareQuery.data?.visibility === 'specific';

		const [enabled, setEnabled] = useState(false);
		const [timing, setTiming] = useState<DeliveryTiming>('after-refresh');
		const [preset, setPreset] = useState<string>(DEFAULT_PRESET);
		const [customCron, setCustomCron] = useState('');
		const [nlInput, setNlInput] = useState('');
		const [savedNlInput, setSavedNlInput] = useState('');
		const [nlConvertFailed, setNlConvertFailed] = useState(false);
		const [selectedRecipientMode, setRecipientMode] = useState<RecipientMode>('specific');
		const recipientMode: RecipientMode = canDeliverToAll ? selectedRecipientMode : 'specific';
		const [selected, setSelected] = useState<Set<string>>(new Set());
		const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
		const [emailEnabled, setEmailEnabled] = useState(true);
		const [slackEnabled, setSlackEnabled] = useState(false);
		const [search, setSearch] = useState('');

		const recipientGroupsQuery = useQuery({
			...storyApi.story.listDeliveryRecipientGroups.queryOptions({ chatId, storySlug }),
			enabled: open && recipientMode === 'specific',
		});

		// Seed the form from server state only once per dialog open. Re-syncing on every
		// refetch (e.g. after a mutation or window refocus) would discard unsaved edits.
		const initializedRef = useRef(false);
		useEffect(() => {
			if (!open) {
				initializedRef.current = false;
				return;
			}
			if (initializedRef.current || !delivery.data) {
				return;
			}
			initializedRef.current = true;
			setEnabled(delivery.data.enabled);
			const initialTiming = resolveInitialTiming(delivery.data.cron, delivery.data.enabled, refreshCron);
			setTiming(initialTiming);
			const scheduleValue =
				initialTiming === 'custom-schedule' ? resolveScheduleValue(delivery.data.cron) : DEFAULT_PRESET;
			setPreset(scheduleValue);
			setCustomCron(scheduleValue === CUSTOM_PRESET ? (delivery.data.cron ?? '') : '');
			const desc = delivery.data.scheduleDescription ?? '';
			setNlInput(scheduleValue === CUSTOM_PRESET ? desc : '');
			setSavedNlInput(scheduleValue === CUSTOM_PRESET ? desc : '');
			setRecipientMode((delivery.data.recipientMode as RecipientMode) ?? 'specific');
			setSelected(new Set(delivery.data.recipientUserIds));
			setSelectedGroups(new Set(delivery.data.recipientGroupIds));
			setEmailEnabled(delivery.data.channels.includes('email'));
			setSlackEnabled(delivery.data.channels.includes('slack'));
		}, [open, delivery.data]); // eslint-disable-line react-hooks/exhaustive-deps

		const updateDelivery = useMutation(
			storyApi.story.updateDelivery.mutationOptions({
				onSuccess: () => {
					queryClient.invalidateQueries({
						queryKey: storyApi.story.getDelivery.queryKey({ chatId, storySlug }),
					});
					// Enabling delivery can auto-share the story, so keep sharing state in sync.
					queryClient.invalidateQueries({
						queryKey: storyApi.storyShare.getSharedStoryInfo.queryKey({ chatId, storySlug }),
					});
					queryClient.invalidateQueries({ queryKey: storyApi.storyShare.list.queryKey() });
				},
			}),
		);

		const cronNlpMutation = useMutation(
			storyApi.story.parseCronFromText.mutationOptions({
				onSuccess: (data, variables) => {
					if (data.cron) {
						setCustomCron(data.cron);
						setSavedNlInput(variables.text);
						setNlConvertFailed(false);
					} else {
						setNlConvertFailed(true);
					}
				},
			}),
		);

		const handleNlConvert = useCallback(() => {
			const text = nlInput.trim();
			if (!text) {
				return;
			}
			setNlConvertFailed(false);
			cronNlpMutation.mutate({ text });
		}, [nlInput, cronNlpMutation]);

		const handleEnabledChange = useCallback(
			(next: boolean) => {
				setEnabled(next);
				if (next) {
					setTiming('after-refresh');
					setEmailEnabled(true);
					setSlackEnabled(false);
					setRecipientMode('specific');
					setSelected(currentUserId ? new Set([currentUserId]) : new Set());
					setSelectedGroups(new Set());
				}
			},
			[currentUserId],
		);

		const handleCustomCronChange = useCallback((value: string) => {
			setCustomCron(value);
			setSavedNlInput('');
		}, []);

		const handlePresetChange = useCallback((value: string) => {
			setPreset(value);
			if (value !== CUSTOM_PRESET) {
				setCustomCron('');
				setNlInput('');
				setSavedNlInput('');
				setNlConvertFailed(false);
			}
		}, []);

		const filteredMembers = useMemo(() => {
			const members = recipientsQuery.data ?? [];
			const term = search.trim().toLowerCase();
			if (!term) {
				return members;
			}
			return members.filter(
				(member) => member.name.toLowerCase().includes(term) || member.email.toLowerCase().includes(term),
			);
		}, [recipientsQuery.data, search]);

		const filteredGroups = useMemo(() => {
			const groups = recipientGroupsQuery.data ?? [];
			const term = search.trim().toLowerCase();
			if (!term) {
				return groups;
			}
			return groups.filter((group) => group.name.toLowerCase().includes(term));
		}, [recipientGroupsQuery.data, search]);

		const resolvedCron =
			timing === 'after-refresh'
				? hasMirrorableRefresh(refreshCron)
					? refreshCron
					: null
				: preset === CUSTOM_PRESET
					? customCron.trim() || null
					: preset;
		const resolvedScheduleDescription =
			timing === 'custom-schedule' && preset === CUSTOM_PRESET ? savedNlInput.trim() || null : null;

		const channels = useMemo(() => {
			const result: NotificationChannel[] = [];
			if (emailEnabled) {
				result.push('email');
			}
			if (slackEnabled) {
				result.push('slack');
			}
			return result;
		}, [emailEnabled, slackEnabled]);

		// Slack delivery needs the Slack integration (Phase 7, docs/deferred-features.md).
		const isSlackConfigured = false;

		const valid =
			!enabled ||
			(channels.length > 0 &&
				(recipientMode === 'all' || selected.size > 0 || selectedGroups.size > 0) &&
				(timing === 'after-refresh' || Boolean(resolvedCron)));

		const dirty = useMemo(() => {
			const initial = delivery.data;
			if (!initial) {
				return enabled;
			}
			return (
				initial.enabled !== enabled ||
				(initial.cron ?? null) !== resolvedCron ||
				initial.scheduleDescription !== resolvedScheduleDescription ||
				initial.recipientMode !== recipientMode ||
				(recipientMode === 'specific' &&
					(!hasSameIds(initial.recipientUserIds, selected) ||
						!hasSameIds(initial.recipientGroupIds, selectedGroups))) ||
				initial.channels.includes('email') !== emailEnabled ||
				initial.channels.includes('slack') !== slackEnabled
			);
		}, [
			delivery.data,
			enabled,
			resolvedCron,
			resolvedScheduleDescription,
			recipientMode,
			selected,
			selectedGroups,
			emailEnabled,
			slackEnabled,
		]);

		useEffect(() => {
			onStatusChange({ dirty, valid });
		}, [dirty, valid, onStatusChange]);

		const toggleUser = (userId: string) => {
			setSelected((prev) => toggleId(prev, userId));
		};

		const toggleGroup = (groupId: string) => {
			setSelectedGroups((prev) => toggleId(prev, groupId));
		};

		useImperativeHandle(
			ref,
			() => ({
				save: async () => {
					if (!dirty) {
						return;
					}
					await updateDelivery.mutateAsync({
						chatId,
						storySlug,
						enabled,
						cron: enabled ? resolvedCron : null,
						scheduleDescription: enabled ? resolvedScheduleDescription : null,
						channels: channels.length > 0 ? channels : ['email'],
						recipientMode,
						recipientUserIds: recipientMode === 'all' ? [] : [...selected],
						recipientGroupIds: recipientMode === 'all' ? [] : [...selectedGroups],
					});
				},
			}),
			[
				dirty,
				chatId,
				storySlug,
				enabled,
				resolvedCron,
				resolvedScheduleDescription,
				channels,
				recipientMode,
				selected,
				selectedGroups,
				updateDelivery,
			],
		);

		return (
			<section className={styles.storyDeliverySectionSection}>
				<div className={styles.storyDeliverySectionDiv}>
					<div className={styles.storyDeliverySectionDiv2}>
						<div className={styles.storyDeliverySectionDiv3}>
							<Send className={styles.storyDeliverySectionSend} />
						</div>
						<div className={styles.storyDeliverySectionDiv4}>
							<p className={styles.storyDeliverySectionP}>Scheduled delivery</p>
							<p className={styles.storyDeliverySectionP2}>
								Automatically send the latest version of this story.
							</p>
						</div>
					</div>
					<Switch checked={enabled} onCheckedChange={handleEnabledChange} />
				</div>

				{enabled && (
					<div className={styles.storyDeliverySectionDiv5}>
						<div className={styles.storyDeliverySectionDiv6}>
							<TimingOption
								active={timing === 'after-refresh'}
								label='Whenever the story refreshes'
								onClick={() => setTiming('after-refresh')}
							/>
							<div className={styles.storyDeliverySectionDiv7}>
								<TimingOption
									active={timing === 'custom-schedule'}
									label='On a schedule'
									onClick={() => setTiming('custom-schedule')}
								/>
								{timing === 'custom-schedule' && (
									<div className={styles.storyDeliverySectionDiv8}>
										<DeliverySchedulePicker
											preset={preset}
											customCron={customCron}
											nlInput={nlInput}
											savedNlInput={savedNlInput}
											nlConvertPending={cronNlpMutation.isPending}
											nlConvertError={cronNlpMutation.isError || nlConvertFailed}
											onPresetChange={handlePresetChange}
											onCustomCronChange={handleCustomCronChange}
											onNlInputChange={(v) => {
												setNlInput(v);
												setNlConvertFailed(false);
												if (!v.trim()) {
													setSavedNlInput('');
												}
											}}
											onNlConvert={handleNlConvert}
										/>
									</div>
								)}
							</div>
						</div>

						<div className={styles.storyDeliverySectionDiv9}>
							<label className={styles.storyDeliverySectionP}>Channels</label>
							<div className={styles.storyDeliverySectionDiv10}>
								<ChannelCard
									icon={<Mail className={styles.storyDeliverySectionSend} />}
									label='Email'
									active={emailEnabled}
									onClick={() => setEmailEnabled((v) => !v)}
								/>
								{isSlackConfigured ? (
									<ChannelCard
										icon={<Slack className={styles.storyDeliverySectionSend} />}
										label='Slack'
										active={slackEnabled}
										onClick={() => setSlackEnabled((v) => !v)}
									/>
								) : (
									<SimpleTooltip content='Connect Slack in your project settings to deliver stories to Slack.'>
										<span className={styles.storyDeliverySectionSpan}>
											<ChannelCard
												icon={<Slack className={styles.storyDeliverySectionSend} />}
												label='Slack'
												active={false}
												disabled
												onClick={() => {}}
												className={styles.storyDeliverySectionChannelCard}
											/>
										</span>
									</SimpleTooltip>
								)}
							</div>
						</div>

						{!isShared && (
							<div className={styles.storyDeliverySectionDiv11}>
								{audience.canShareToProject
									? "This story isn't shared yet. Scheduling delivery will share it with your project so recipients can open it."
									: "This story isn't shared yet. Scheduling delivery will share it with the selected recipients so they can open it."}
							</div>
						)}

						<div className={styles.storyDeliverySectionDiv7}>
							<div className={styles.storyDeliverySectionDiv9}>
								<label className={styles.storyDeliverySectionP}>Recipients</label>
								<Select
									value={recipientMode}
									onValueChange={(value) => setRecipientMode(value as RecipientMode)}
								>
									<SelectTrigger className={styles.storyDeliverySectionSelectTrigger}>
										<SelectValue />
									</SelectTrigger>
									<SelectContent className={styles.storyDeliverySectionSelectContent}>
										{canDeliverToAll && (
											<SelectItem value='all'>
												{isShared ? 'Everyone with access' : 'All project members'}
											</SelectItem>
										)}
										<SelectItem value='specific'>Specific members & groups</SelectItem>
									</SelectContent>
								</Select>
							</div>
							{recipientMode === 'specific' && (
								<MemberPicker
									members={filteredMembers}
									selectedUserIds={selected}
									isLoading={recipientsQuery.isLoading || recipientGroupsQuery.isLoading}
									search={search}
									onSearchChange={setSearch}
									onToggleUser={toggleUser}
									groups={filteredGroups}
									selectedGroupIds={selectedGroups}
									onToggleGroup={toggleGroup}
									emptyMessage={audience.emptyMessage}
								/>
							)}
						</div>
					</div>
				)}
			</section>
		);
	},
);

function TimingOption({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
	return (
		<button type='button' onClick={onClick} className={styles.timingOptionButton}>
			<span className={cn(styles.timingOptionSpan, active ? styles.timingOptionSpan2 : styles.timingOptionSpan3)}>
				{active && <span className={styles.timingOptionSpan4} />}
			</span>
			<div className={styles.timingOptionDiv}>
				<span className={styles.timingOptionSpan5}>{label}</span>
			</div>
		</button>
	);
}

function DeliverySchedulePicker({
	preset,
	customCron,
	nlInput,
	savedNlInput,
	nlConvertPending,
	nlConvertError,
	onPresetChange,
	onCustomCronChange,
	onNlInputChange,
	onNlConvert,
}: {
	preset: string;
	customCron: string;
	nlInput: string;
	savedNlInput: string;
	nlConvertPending: boolean;
	nlConvertError: boolean;
	onPresetChange: (value: string) => void;
	onCustomCronChange: (value: string) => void;
	onNlInputChange: (value: string) => void;
	onNlConvert: () => void;
}) {
	const hasUnsavedDescriptionChanges = nlInput.trim() !== savedNlInput.trim();

	return (
		<div className={styles.storyDeliverySectionDiv7}>
			<Select value={preset} onValueChange={onPresetChange}>
				<SelectTrigger className={styles.deliverySchedulePickerSelectTrigger}>
					<SelectValue />
				</SelectTrigger>
				<SelectContent className={styles.storyDeliverySectionSelectContent}>
					{SCHEDULE_OPTIONS.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{preset === CUSTOM_PRESET && (
				<div className={styles.storyDeliverySectionDiv6}>
					<div className={styles.deliverySchedulePickerDiv}>
						<label className={styles.deliverySchedulePickerLabel}>Describe in plain English</label>
						<div className={styles.deliverySchedulePickerDiv2}>
							<Input
								value={nlInput}
								onChange={(e) => onNlInputChange(e.target.value)}
								placeholder='e.g. every weekday at 9am'
								className={styles.deliverySchedulePickerInput}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										onNlConvert();
									}
								}}
							/>
							<Button
								variant='outline'
								size='sm'
								className={styles.deliverySchedulePickerButton}
								onClick={onNlConvert}
								disabled={!nlInput.trim() || nlConvertPending}
							>
								{nlConvertPending ? (
									<Loader2 className={styles.deliverySchedulePickerLoader2} />
								) : (
									<Wand2 className={styles.deliverySchedulePickerWand2} />
								)}
								<span>Convert</span>
							</Button>
						</div>
						{nlConvertError && (
							<p className={styles.deliverySchedulePickerP}>
								Could not convert to cron expression. Try a different description.
							</p>
						)}
						{!nlConvertError && (
							<p className={styles.deliverySchedulePickerP2}>
								{hasUnsavedDescriptionChanges
									? 'Click Convert to update the cron expression.'
									: 'This description is saved with the schedule.'}
							</p>
						)}
					</div>

					<div className={styles.deliverySchedulePickerDiv}>
						<label className={styles.deliverySchedulePickerLabel}>Or enter a cron expression</label>
						<Input
							value={customCron}
							onChange={(e) => onCustomCronChange(e.target.value)}
							placeholder='0 8 * * *'
							className={styles.deliverySchedulePickerInput2}
						/>
						<p className={styles.deliverySchedulePickerP2}>
							Format: minute hour day-of-month month day-of-week
						</p>
					</div>
				</div>
			)}
		</div>
	);
}

function ChannelCard({
	icon,
	label,
	active,
	disabled,
	onClick,
	className,
}: {
	icon: React.ReactNode;
	label: string;
	active: boolean;
	disabled?: boolean;
	onClick: () => void;
	className?: string;
}) {
	return (
		<button
			type='button'
			onClick={onClick}
			disabled={disabled}
			className={cn(
				styles.channelCardButton,
				active ? styles.timingOptionSpan2 : disabled ? styles.channelCardButton2 : styles.channelCardButton3,
				className,
			)}
		>
			<div className={cn(styles.channelCardDiv, active ? styles.channelCardDiv2 : '')}>{icon}</div>
			<span className={styles.timingOptionSpan5}>{label}</span>
		</button>
	);
}

function hasMirrorableRefresh(refreshCron: string | null): refreshCron is string {
	return refreshCron !== null && refreshCron !== NO_CACHE_SCHEDULE;
}

function resolveInitialTiming(cron: string | null, enabled: boolean, refreshCron: string | null): DeliveryTiming {
	if (cron === null) {
		return enabled ? 'after-refresh' : 'custom-schedule';
	}
	return hasMirrorableRefresh(refreshCron) && cron === refreshCron ? 'after-refresh' : 'custom-schedule';
}

function resolveScheduleValue(cron: string | null): string {
	if (cron === null) {
		return DEFAULT_PRESET;
	}
	return STANDARD_PRESETS.some((p) => p.value === cron) ? cron : CUSTOM_PRESET;
}

function hasSameIds(initialIds: string[], currentIds: Set<string>): boolean {
	return initialIds.length === currentIds.size && initialIds.every((id) => currentIds.has(id));
}

function toggleId(ids: Set<string>, id: string): Set<string> {
	const next = new Set(ids);
	if (next.has(id)) {
		next.delete(id);
	} else {
		next.add(id);
	}
	return next;
}
