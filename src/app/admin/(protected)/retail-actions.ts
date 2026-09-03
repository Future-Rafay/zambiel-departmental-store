"use server";

import { adjustInventory as adjustInventoryImpl, advanceRetailOrder as advanceRetailOrderImpl } from "./retail-actions/inventory-orders";
import { addRetailMedia as addRetailMediaImpl, removeRetailMedia as removeRetailMediaImpl, updateRetailMedia as updateRetailMediaImpl } from "./retail-actions/media";
import { deleteRetailCategory as deleteRetailCategoryImpl, deleteRetailProduct as deleteRetailProductImpl, saveRetailCategory as saveRetailCategoryImpl, saveRetailProduct as saveRetailProductImpl } from "./retail-actions/product-category";
import { addRetailVariant as addRetailVariantImpl, deleteRetailVariant as deleteRetailVariantImpl, generateVariantMatrix as generateVariantMatrixImpl, saveRetailVariant as saveRetailVariantImpl } from "./retail-actions/variants-options";

export async function adjustInventory(data: FormData) { return adjustInventoryImpl(data); }
export async function advanceRetailOrder(data: FormData) { return advanceRetailOrderImpl(data); }
export async function addRetailMedia(data: FormData) { return addRetailMediaImpl(data); }
export async function removeRetailMedia(data: FormData) { return removeRetailMediaImpl(data); }
export async function updateRetailMedia(data: FormData) { return updateRetailMediaImpl(data); }
export async function deleteRetailCategory(data: FormData) { return deleteRetailCategoryImpl(data); }
export async function deleteRetailProduct(data: FormData) { return deleteRetailProductImpl(data); }
export async function saveRetailCategory(data: FormData) { return saveRetailCategoryImpl(data); }
export async function saveRetailProduct(data: FormData) { return saveRetailProductImpl(data); }
export async function addRetailVariant(data: FormData) { return addRetailVariantImpl(data); }
export async function deleteRetailVariant(data: FormData) { return deleteRetailVariantImpl(data); }
export async function generateVariantMatrix(data: FormData) { return generateVariantMatrixImpl(data); }
export async function saveRetailVariant(data: FormData) { return saveRetailVariantImpl(data); }
