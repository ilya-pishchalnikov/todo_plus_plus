import { AppEvent } from './appevent';
import { computed } from 'vue';
const AppEventInstance = new AppEvent();

const isConnected = computed(() => {
    return AppEventInstance.isConnected();
});

export const AppEventKey = Symbol('AppEventService');

export const AppEventService = {
    instance: AppEventInstance,
    isConnected
};