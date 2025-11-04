import { ComputedRef, InjectionKey } from 'vue';
import { AppEvent } from './appevent.js';

export interface AppEventServiceInterface {
    instance: AppEvent; 
    isConnected: ComputedRef<boolean>;
    
    handleSave: (data: any) => void;
    handleCancel: () => void;
}

export declare const AppEventKey: InjectionKey<AppEventServiceInterface>;

export declare const AppEventService: AppEventServiceInterface;