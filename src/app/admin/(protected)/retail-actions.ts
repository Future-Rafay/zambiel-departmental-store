"use server";

import { adjustInventory as adjustInventoryImpl, advanceRetailOrder as advanceRetailOrderImpl } from "./retail-actions/inventory-orders";
import { addRetailMedia as addRetailMediaImpl, removeRetailMedia as removeRetailMediaImpl, updateRetailMedia as updateRetailMediaImpl } from "./retail-actions/media";
import { archiveRetailCategory as archiveRetailCategoryImpl, archiveRetailProduct as archiveRetailProductImpl, saveRetailCategory as saveRetailCategoryImpl, saveRetailProduct as saveRetailProductImpl } from "./retail-actions/product-category";
import { addRetailVariant as addRetailVariantImpl, archiveRetailVariant as archiveRetailVariantImpl, generateVariantMatrix as generateVariantMatrixImpl, saveRetailVariant as saveRetailVariantImpl } from "./retail-actions/variants-options";

export async function adjustInventory(data: FormData) { return adjustInventoryImpl(data); }
export async function advanceRetailOrder(data: FormData) { return advanceRetailOrderImpl(data); }
export async function addRetailMedia(data: FormData) { return addRetailMediaImpl(data); }
export async function removeRetailMedia(data: FormData) { return removeRetailMediaImpl(data); }
export async function updateRetailMedia(data: FormData) { return updateRetailMediaImpl(data); }
export async function archiveRetailCategory(data: FormData) { return archiveRetailCategoryImpl(data); }
export async function archiveRetailProduct(data: FormData) { return archiveRetailProductImpl(data); }
export async function saveRetailCategory(data: FormData) { return saveRetailCategoryImpl(data); }
export async function saveRetailProduct(data: FormData) { return saveRetailProductImpl(data); }
export async function addRetailVariant(data: FormData) { return addRetailVariantImpl(data); }
export async function archiveRetailVariant(data: FormData) { return archiveRetailVariantImpl(data); }
export async function generateVariantMatrix(data: FormData) { return generateVariantMatrixImpl(data); }
export async function saveRetailVariant(data: FormData) { return saveRetailVariantImpl(data); }
