<template>
    <div>
        <Dropdown v-model=selectedAsset :style="{ 'width': '100%' }" :options=assetOptions :filter="true"
            :filterFields="['id', 'namespace']" emptyFilterMessage=" "
            :virtualScrollerOptions="{ lazy: true, onLazyLoad: onLazyLoad, showLoader: true, loading: loading, delay: 0, itemSize: 38 }"
            @change="selectAsset($event.value); $emit('update:modelValue', $event.value.value); $emit('select-asset', $event.value.value);">
            <template #value="slotProps">
                <div v-if="slotProps.value">
                    <div class='flex justify-between'>
                        <div class='flex flex-col ml-2 text-left'>
                            <div class='text-blue-primary font-semibold text-xxs uppercase' style="line-height: 9px;">
                                Selected Asset</div>
                            <div class='mt-1 text-tsm font-bold'>{{ displayAssetFullName(slotProps.value.namespace == "" ? slotProps.value.id :
                                slotProps.value.namespace )}}</div>
                        </div>
                        <div class='mt-1 text-tsm font-bold'>Balance: {{ slotProps.value.amount }}</div>
                    </div>
                </div>
            </template>
            <template #option="slotProps">
                <div class="account-item">
                    <div class='flex justify-between'>

                        <div class='mt-1 text-tsm font-bold'>{{ displayAssetFullName(slotProps.option.namespace == "" ? slotProps.option.id :
                                slotProps.option.namespace )}}</div>
                        <div class='mt-1 text-tsm font-bold'>Balance: {{ slotProps.option.amount }}</div>
                    </div>
                </div>
            </template>
        </Dropdown>
    </div>
</template>
  
<script setup lang="ts">
import { AppState } from '@/state/appState';
import { VirtualScrollerLazyEvent } from 'primevue/virtualscroller';
import { Address, MosaicId } from 'tsjs-xpx-chain-sdk';
import { ref, getCurrentInstance, toRefs, watch, PropType } from 'vue';

const props = defineProps({
    selectedAddress: {
        type: String as PropType<string | null>,
        required: false
    },
    selectedMultisigAddress: {
        type: String as PropType<string | null>,
        required: false
    }
})

const knownToken = [{
    namespace: "prx.xpx",
    name: "XPX"
},
{
    namespace: "prx.metx",
    name: "METX"
}, {
    namespace: "xarcade.xar",
    name: "XAR"
}];

const displayAssetFullName = (name: string) => {
    const findKnownToken = knownToken.find(token => token.namespace == name)
    if (findKnownToken) {
        return findKnownToken.name
    }

    return name
}

defineEmits([
    'select-asset', 'update:modelValue'
])

const { selectedAddress, selectedMultisigAddress } = toRefs(props);

const assetOptions = ref<{ id: string, amount: number, namespace: string, divisibility: number, isTransferable: boolean, hasUpdated: boolean }[]>([])
const loading = ref(false);

const fetchAssets = async (address: string | null) => {
    if (!AppState.chainAPI) {
        return
    }
    if (!address) {
        return
    }
    selectAsset(null)
    assetOptions.value = [];

        const accInfo = await AppState.chainAPI.accountAPI.getAccountInfo(Address.createFromRawAddress(address))
    for (let i = 0; i < accInfo.mosaics.length; i++) {
        const asset = accInfo.mosaics[i];
        assetOptions.value.push({
            id: asset.id.toHex(),
            amount: asset.amount.compact(),
            divisibility: 0,
            namespace: '',
            isTransferable: false,
            hasUpdated: false
        })
    } 
    
    
}

const selectedAsset = ref<{ id: string, amount: number, namespace: string, divisibility: number } | null>(null)




watch([selectedAddress, selectedMultisigAddress],([n,mn])=>{
    selectedAsset.value = null;
    //reload asset
    if(n != null && mn == null){
        fetchAssets(n)
    }else if(n!= null && mn!= null){
       
        fetchAssets(mn)
    }
})


const onLazyLoad = async (event: VirtualScrollerLazyEvent) => {
    if(loading.value){
        return
    }
    loading.value = true;

    const { first, last } = event;
    const selectedMosaicIds: MosaicId[] = [];
    const end = Math.min(last, assetOptions.value.length);
    for (let i = first; i < end; i++) {
        if (!assetOptions.value[i] || assetOptions.value[i].hasUpdated) {
            continue;
        }
        selectedMosaicIds.push(new MosaicId(assetOptions.value[i].id))
    }
    if (!selectedMosaicIds.length) {
        loading.value = false;
        return
    }
    const names = await AppState.chainAPI.assetAPI.getMosaicsNames(selectedMosaicIds)
    const assetProperties = await AppState.chainAPI.assetAPI.getMosaics(selectedMosaicIds)

    const namesMap = new Map<string, string>();
    names.forEach((mosaic) => {
        namesMap.set(mosaic.mosaicId.toHex(), mosaic.names.length ? mosaic.names[0].name : '');
    });

    const propsMap = new Map<string, { divisibility: number, isTransferable: boolean }>();
    assetProperties.forEach((prop) => {
        propsMap.set(prop.mosaicId.toHex(), {
            divisibility: prop.divisibility,
            isTransferable: prop.isTransferable()
        });
    });

    for (let i = first; i < end; i++) {
        const asset = assetOptions.value[i];
        if (!asset || asset.hasUpdated) {
            continue;
        }
        if (namesMap.has(asset.id)) {
            asset.namespace = namesMap.get(asset.id) || '';
        }
        if (propsMap.has(asset.id)) {
            const prop = propsMap.get(asset.id)!;
            asset.amount = asset.amount / Math.pow(10, prop.divisibility);
            asset.divisibility = prop.divisibility;
            asset.isTransferable = prop.isTransferable;
            asset.hasUpdated = true;
        }
    }

    loading.value = false;

}


const internalInstance = getCurrentInstance();
const emitter = internalInstance.appContext.config.globalProperties.emitter;

const selectAsset = (asset: { id: string, amount: number, namespace: string, divisibility: number, isTransferable: boolean }) => {
    emitter.emit("select-asset", asset)
    selectedAsset.value = asset;

};


</script>
  