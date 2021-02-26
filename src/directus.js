async function getUserRequest (dbConnection, userRequestID) {
    const userRequest = await dbConnection.awaitQuery( 'SELECT * FROM user_requests WHERE id = ?', [userRequestID] );

    return userRequest[0];
}

async function getDirectusFileRow (dbConnection, inputFileID) {
	const file = await dbConnection.awaitQuery( 'SELECT * FROM directus_files WHERE id = ?', [inputFileID] );

	return file[0]
}

async function getDirectusFileName (row, directusUploadFolder) {
	return directusUploadFolder + row.filename_disk;
}

async function logProcessProgress (dbConnection, pendingUserRequest, msg) {
    const userRequest = await getUserRequest(dbConnection, pendingUserRequest.id);

    const now       = new Date();
    const msgWithTS = `[${now}] ${msg}`;

    const userRequestLogs    = userRequest.logs;
    const updatedRequestLogs = `${msgWithTS}\n${userRequestLogs}`;


    return await dbConnection.awaitQuery(
        "UPDATE user_requests SET logs = ? WHERE id = ?", [updatedRequestLogs, pendingUserRequest.id]
    );
}

async function saveResultCSV (dbConnection, resultCSV) {

    const resultRow = await dbConnection.awaitQuery(
        'INSERT INTO directus_files (private_hash, storage, filename_disk, filename_download, title, uploaded_by, uploaded_on, filesize, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [ 'manual_upload', 'local', resultCSV.fileName, resultCSV.fileName, resultCSV.fileName, 1, new Date(), 1, 0]
    );

    return resultRow;
}

async function setUserRequestCompleted (dbConnection, pendingUserRequest, outputFileId) {
    return await dbConnection.awaitQuery(
        "UPDATE user_requests SET status = ?, output_file = ?, analysis_date = ? WHERE id = ?", ['complete', outputFileId, new Date(), pendingUserRequest.id]
    );
}

async function updateRequestStatus (dbConnection, pendingUserRequest, status) {
    return await dbConnection.awaitQuery(
        "UPDATE user_requests SET status = ? WHERE id = ?", [status, pendingUserRequest.id]
    );
}

async function updateProcessedRows (dbConnection, pendingUserRequest, rowCount) {
    return await dbConnection.awaitQuery(
        "UPDATE user_requests SET processed_rows = ? WHERE id = ?", [rowCount, pendingUserRequest.id]
    );
}

export default {
    getDirectusFileRow,
    getDirectusFileName,
    logProcessProgress,
    saveResultCSV,
    setUserRequestCompleted,
    updateRequestStatus
}