<template>
    <div>
        <Dropdown :showClear="true" v-model="selectedAssets[index]" :style="{ 'width': '100%' }" :options=assetWhiteList
            :filter="true" :filterFields="['id', 'namespace']" emptyFilterMessage=" " placeholder="Select Asset"
            :virtualScrollerOptions="{ lazy: true, onLazyLoad: onLazyLoad, showLoader: true, loading: loading, delay: 0, itemSize: 38 }"
            @change="selectAsset($event.value); $emit('update:modelValue', $event.value?.value);">
            <template #value="slotProps">
                <div v-if="slotProps.value.id">
                    <div class='flex justify-between'>
                        <div class='flex flex-col ml-2 text-left'>
                            <div class='text-blue-primary font-semibold text-xxs uppercase' style="line-height: 9px;">
                                Selected Asset</div>
                            <div class='mt-1 text-tsm font-bold'>{{ displayAssetFullName(slotProps.value.namespace == "" ?
                                slotProps.value.id :
                                slotProps.value.namespace) }}</div>
                        </div>
                        <div class='mt-1 text-tsm font-bold'>Balance: {{ slotProps.value.balance }}</div>
                    </div>
                </div>
            </template>
            <template #option="slotProps">
                <div class="account-item">
                    <div class='flex justify-between'>

                        <div class='mt-1 text-tsm font-bold'>{{ displayAssetFullName(slotProps.option.namespace == "" ?
                            slotProps.option.id :
                            slotProps.option.namespace) }}</div>
                        <div class='mt-1 text-tsm font-bold'>Balance: {{ slotProps.option.balance }}</div>
                    </div>
                </div>
            </template>
        </Dropdown>
    </div>
</template>
  
<script setup lang="ts">
import { AppState } from '@/state/appState';
import { VirtualScrollerLazyEvent } from 'primevue/virtualscroller';
import {  MosaicId } from 'tsjs-xpx-chain-sdk';
import { ref, toRefs,  PropType, computed } from 'vue';

const props = defineProps({
    index: {
        type: Number,
        required: true
    },
    assetOptions: {
        type: Object as PropType<{ id: string, balance: number, namespace: string, divisibility: number, hasUpdated: boolean }[]>,
        required: true
    },
    selectedAssets: {
        type: Object as PropType<{ id: string, balance: number, amount: string, namespace: string, divisibility: number }[]>,
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

const { assetOptions, selectedAssets, index } = toRefs(props);

const loading = ref(false);

const assetWhiteList = computed(() => {
    const selectedIdsSet = new Set(selectedAssets.value.map(asset => asset.id));

    return assetOptions.value.filter(asset => !selectedIdsSet.has(asset.id));
});



const onLazyLoad = async (event: VirtualScrollerLazyEvent) => {
    if (loading.value) {
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

    const propsMap = new Map<string, number>();
    assetProperties.forEach((prop) => {
        propsMap.set(prop.mosaicId.toHex(), prop.divisibility);
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
            const divisibility = propsMap.get(asset.id)!;
            asset.balance = asset.balance / Math.pow(10, divisibility);
            asset.divisibility = divisibility;
            asset.hasUpdated = true;
        }
    }

    loading.value = false;

}

const selectAsset = (asset: { id: string, balance: number, namespace: string, divisibility: number }) => {
    if (asset == null) {
        selectedAssets.value.splice(index.value, 1)

        return
    }
    selectedAssets.value[index.value].balance = asset.balance
    selectedAssets.value[index.value].id = asset.id
    selectedAssets.value[index.value].namespace = asset.namespace
    selectedAssets.value[index.value].divisibility = asset.divisibility
    selectedAssets.value[index.value].amount = '0'


};



</script>
  