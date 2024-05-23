import { useLocation } from "react-router-dom";
import { FolderType } from "../../../../pages/MainPage/entities";
import { addFolder, updateFolder } from "../../../../pages/MainPage/services";
import { handleDownloadFolderFn } from "../../../../pages/MainPage/utils/handle-download-folder";
import useAlertStore from "../../../../stores/alertStore";
import useFlowsManagerStore from "../../../../stores/flowsManagerStore";
import { useFolderStore } from "../../../../stores/foldersStore";
import { cn } from "../../../../utils/utils";
import IconComponent, {
  ForwardedIconComponent,
} from "../../../genericIconComponent";
import { Button, buttonVariants } from "../../../ui/button";
import useFileDrop from "../../hooks/use-on-file-drop";
import { useEffect, useRef, useState } from "react";
import InputComponent from "../../../inputComponent";
import { updateFlowInDatabase } from "../../../../controllers/API";
import { Input } from "../../../ui/input";
import { handleKeyDown } from "../../../../utils/reactflowUtils";

type SideBarFoldersButtonsComponentProps = {
  folders: FolderType[];
  pathname: string;
  handleChangeFolder?: (id: string) => void;
  handleEditFolder?: (item: FolderType) => void;
  handleDeleteFolder?: (item: FolderType) => void;
};
const SideBarFoldersButtonsComponent = ({
  pathname,
  handleChangeFolder,
  handleEditFolder,
  handleDeleteFolder,
}: SideBarFoldersButtonsComponentProps) => {
  const refInput = useRef<HTMLInputElement>(null);
  const setFolders = useFolderStore((state) => state.setFolders);
  const folders = useFolderStore((state) => state.folders);
  const [foldersNames, setFoldersNames] = useState({});
  const takeSnapshot = useFlowsManagerStore((state) => state.takeSnapshot);
  const [editFolders, setEditFolderName] = useState(
    folders.map((obj) => ({ name: obj.name, edit: false })),
  );
  const uploadFolder = useFolderStore((state) => state.uploadFolder);
  const currentFolder = pathname.split("/");
  const urlWithoutPath = pathname.split("/").length < 4;
  const myCollectionId = useFolderStore((state) => state.myCollectionId);
  const allFlows = useFlowsManagerStore((state) => state.allFlows);
  const setErrorData = useAlertStore((state) => state.setErrorData);
  const getFoldersApi = useFolderStore((state) => state.getFoldersApi);

  const checkPathName = (itemId: string) => {
    if (urlWithoutPath && itemId === myCollectionId) {
      return true;
    }
    return currentFolder.includes(itemId);
  };
  const location = useLocation();
  const folderId = location?.state?.folderId ?? myCollectionId;
  const getFolderById = useFolderStore((state) => state.getFolderById);

  const handleFolderChange = (folderId: string) => {
    getFolderById(folderId);
  };

  const { dragOver, dragEnter, dragLeave, onDrop } = useFileDrop(
    folderId,
    handleFolderChange,
  );

  const handleUploadFlowsToFolder = () => {
    uploadFolder(folderId);
  };

  const handleDownloadFolder = (id: string) => {
    handleDownloadFolderFn(id);
  };

  function addNewFolder() {
    addFolder({ name: "New Folder", parent_id: null, description: "" }).then(
      (res) => {
        getFoldersApi(true);
      },
    );
  }

  function handleEditFolderName(e, name): void {
    const {
      target: { value },
    } = e;
    setFoldersNames((old) => ({
      ...old,
      [name]: value,
    }));
  }

  useEffect(() => {}, [folders, setFolders]);

  useEffect(() => {
    folders.map((obj) => ({ name: obj.name, edit: false }));
  }, [folders]);
  const setLoading = useAlertStore((state) => state.setLoading);

  return (
    <>
      <div className="flex shrink-0 items-center justify-between">
        <Button variant="primary" onClick={addNewFolder}>
          <ForwardedIconComponent
            name="Plus"
            className="main-page-nav-button"
          />
          New Folder
        </Button>
        <Button
          variant="primary"
          className="px-7"
          onClick={handleUploadFlowsToFolder}
        >
          <ForwardedIconComponent
            name="Upload"
            className="main-page-nav-button"
          />
          Upload
        </Button>
      </div>

      <div className="flex gap-2 overflow-auto lg:h-[70vh] lg:flex-col">
        <>
          {folders.map((item, index) => {
            const editFolderName = editFolders?.filter(
              (folder) => folder.name === item.name,
            )[0];
            return (
              <div
                onDragOver={dragOver}
                onDragEnter={dragEnter}
                onDragLeave={dragLeave}
                onDrop={(e) => onDrop(e, item.id!)}
                key={item.id}
                data-testid={`sidebar-nav-${item.name}`}
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  checkPathName(item.id!)
                    ? "border border-border bg-muted hover:bg-muted"
                    : "border hover:bg-transparent lg:border-transparent lg:hover:border-border",
                  "group flex w-full shrink-0 cursor-pointer gap-2 opacity-100 lg:min-w-full",
                )}
                onClick={() => handleChangeFolder!(item.id!)}
              >
                <div className="flex w-full items-center gap-2">
                  <IconComponent
                    name={"folder"}
                    className="mr-2 w-4 flex-shrink-0 justify-start stroke-[1.5] opacity-100"
                  />
                  {editFolderName?.edit ? (
                    <div>
                      <Input
                        className=""
                        onChange={(e) => {
                          handleEditFolderName(e, item.name);
                        }}
                        onKeyDown={(e) => {
                          handleKeyDown(e, foldersNames[item.name], "");
                          if (true && e.key === "Enter")
                            refInput.current?.blur();
                        }}
                        autoFocus={true}
                        onBlur={async () => {
                          const newEditFolders = editFolders.map((obj) => {
                            if (obj.name === item.name) {
                              return { name: item.name, edit: false };
                            }
                            return { name: obj.name, edit: false };
                          });
                          setEditFolderName(newEditFolders);
                          if (foldersNames[item.name].trim() !== "") {
                            setFoldersNames((old) => ({
                              ...old,
                              [item.name]: foldersNames[item.name],
                            }));
                            const body = {
                              ...item,
                              name: foldersNames[item.name],
                              flows: item.flows?.length > 0 ? item.flows : [],
                              components:
                                item.components?.length > 0
                                  ? item.components
                                  : [],
                            };
                            const updatedFolder = await updateFolder(
                              body,
                              item.id!,
                            );
                            const updateFolders = folders.filter(
                              (f) => f.name !== item.name,
                            );
                            setFolders([...updateFolders, updatedFolder]);
                            setFoldersNames({});
                          } else {
                            setFoldersNames((old) => ({
                              ...old,
                              [item.name]: item.name,
                            }));
                          }
                        }}
                        value={foldersNames[item.name]}
                        id={`input-folder-${item.name}`}
                      />
                    </div>
                  ) : (
                    <span
                      onDoubleClick={(event) => {
                        if (item.name === "My Projects") {
                          return;
                        }

                        if (!foldersNames[item.name]) {
                          setFoldersNames({ [item.name]: item.name });
                        }

                        if (Object.values(editFolderName).includes(item.name)) {
                          const newEditFolders = editFolders.map((obj) => {
                            if (obj.name === item.name) {
                              return { name: item.name, edit: true };
                            }
                            return { name: obj.name, edit: false };
                          });
                          setEditFolderName(newEditFolders);
                          takeSnapshot();
                          event.stopPropagation();
                          event.preventDefault();
                          return;
                        }

                        setEditFolderName((old) => [
                          ...old,
                          { name: item.name, edit: true },
                        ]);
                        setFoldersNames((oldFolder) => ({
                          ...oldFolder,
                          [item.name]: item.name,
                        }));
                        takeSnapshot();
                        event.stopPropagation();
                        event.preventDefault();
                      }}
                      className="block max-w-full truncate opacity-100"
                    >
                      {item.name}
                    </span>
                  )}
                  <div className="flex-1" />
                  {index > 0 && (
                    <Button
                      className="hidden p-0 hover:bg-white group-hover:block hover:dark:bg-[#0c101a00]"
                      onClick={(e) => {
                        handleDeleteFolder!(item);
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      variant={"ghost"}
                    >
                      <IconComponent
                        name={"trash"}
                        className=" w-4 stroke-[1.5]"
                      />
                    </Button>
                  )}
                  {index > 0 && (
                    <Button
                      className="hidden p-0 hover:bg-white group-hover:block hover:dark:bg-[#0c101a00]"
                      onClick={(e) => {
                        handleEditFolder!(item);
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      variant={"ghost"}
                    >
                      <IconComponent
                        name={"pencil"}
                        className="  w-4 stroke-[1.5] text-white  "
                      />
                    </Button>
                  )}
                  <Button
                    className="hidden p-0 hover:bg-white group-hover:block hover:dark:bg-[#0c101a00]"
                    onClick={(e) => {
                      handleDownloadFolder(item.id!);
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    variant={"ghost"}
                  >
                    <IconComponent
                      name={"Download"}
                      className="  w-4 stroke-[1.5] text-white  "
                    />
                  </Button>
                </div>
              </div>
            );
          })}
        </>
      </div>
    </>
  );
};
export default SideBarFoldersButtonsComponent;
