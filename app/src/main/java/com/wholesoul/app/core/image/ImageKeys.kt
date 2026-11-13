package com.wholesoul.app.core.image

/**
 * Image keys come in two flavours. The starter catalog uses descriptive placeholder keys
 * ("fruits/mango-alphonso") that `ImageProvider` turns into a placeholder picture. A photo the
 * shop owner picked in the Admin Console is stored on the phone and its key is the file's own
 * `file://` address, which is displayed as-is.
 */
fun String.isImportedPhoto(): Boolean = startsWith("file://")
