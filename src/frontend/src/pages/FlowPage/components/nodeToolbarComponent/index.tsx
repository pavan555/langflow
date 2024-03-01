import _, { cloneDeep } from "lodash";
import { useEffect, useState } from "react";
import { useUpdateNodeInternals } from "reactflow";
import ShadTooltip from "../../../../components/ShadTooltipComponent";
import CodeAreaComponent from "../../../../components/codeAreaComponent";
import IconComponent from "../../../../components/genericIconComponent";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../../../../components/ui/select-custom";
import ConfirmationModal from "../../../../modals/ConfirmationModal";
import EditNodeModal from "../../../../modals/EditNodeModal";
import ShareModal from "../../../../modals/shareModal";
import { useDarkStore } from "../../../../stores/darkStore";
import useFlowStore from "../../../../stores/flowStore";
import useFlowsManagerStore from "../../../../stores/flowsManagerStore";
import { useStoreStore } from "../../../../stores/storeStore";
import { APIClassType } from "../../../../types/api";
import { nodeToolbarPropsType } from "../../../../types/components";
import { FlowType } from "../../../../types/flow";
import {
  createFlowComponent,
  downloadNode,
  expandGroupNode,
  unselectAllNodes,
  updateFlowPosition,
} from "../../../../utils/reactflowUtils";
import { classNames, cn } from "../../../../utils/utils";

export default function NodeToolbarComponent({
  data,
  deleteNode,
  position,
  setShowNode,
  numberOfHandles,
  showNode,
  name = "code",
  selected,
  onCloseAdvancedModal,
}: nodeToolbarPropsType): JSX.Element {
  const nodeLength = Object.keys(data.node!.template).filter(
    (templateField) =>
      templateField.charAt(0) !== "_" &&
      data.node?.template[templateField].show &&
      (data.node.template[templateField].type === "str" ||
        data.node.template[templateField].type === "bool" ||
        data.node.template[templateField].type === "float" ||
        data.node.template[templateField].type === "code" ||
        data.node.template[templateField].type === "prompt" ||
        data.node.template[templateField].type === "file" ||
        data.node.template[templateField].type === "Any" ||
        data.node.template[templateField].type === "int" ||
        data.node.template[templateField].type === "dict" ||
        data.node.template[templateField].type === "NestedDict")
  ).length;

  const hasStore = useStoreStore((state) => state.hasStore);
  const hasApiKey = useStoreStore((state) => state.hasApiKey);
  const validApiKey = useStoreStore((state) => state.validApiKey);

  const isMinimal = numberOfHandles <= 1;
  const isGroup = data.node?.flow ? true : false;

  const pinned = data.node?.pinned ?? false;
  const paste = useFlowStore((state) => state.paste);
  const nodes = useFlowStore((state) => state.nodes);
  const edges = useFlowStore((state) => state.edges);
  const setNodes = useFlowStore((state) => state.setNodes);
  const setEdges = useFlowStore((state) => state.setEdges);
  const unselectAll = useFlowStore(state => state.unselectAll);
  const saveComponent = useFlowsManagerStore((state) => state.saveComponent);
  const flows = useFlowsManagerStore((state) => state.flows);
  const version = useDarkStore((state) => state.version);
  const takeSnapshot = useFlowsManagerStore((state) => state.takeSnapshot);
  const [showModalAdvanced, setShowModalAdvanced] = useState(false);
  const [showconfirmShare, setShowconfirmShare] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  const [flowComponent, setFlowComponent] = useState<FlowType>();

  const openInNewTab = (url) => {
    window.open(url, "_blank", "noreferrer");
  };

  useEffect(() => {
    if (!showModalAdvanced) {
      onCloseAdvancedModal!(false);
    }
  }, [showModalAdvanced]);
  const updateNodeInternals = useUpdateNodeInternals();

  const setLastCopiedSelection = useFlowStore(
    (state) => state.setLastCopiedSelection
  );
  useEffect(() => {
    setFlowComponent(createFlowComponent(cloneDeep(data), version));
  }, [
    data,
    data.node,
    data.node?.display_name,
    data.node?.description,
    data.node?.template,
    showModalAdvanced,
    showconfirmShare,
  ]);

  const handleSelectChange = (event) => {
    switch (event) {
      case "advanced":
        setShowModalAdvanced(true);
        break;
      case "show":
        takeSnapshot();
        setShowNode(data.showNode ?? true ? false : true);
        break;
      case "Share":
        if (hasApiKey || hasStore) setShowconfirmShare(true);
        break;
      case "Download":
        downloadNode(flowComponent!);
        break;
      case "SaveAll":
        saveComponent(cloneDeep(data), false);
        break;
      case "documentation":
        if (data.node?.documentation) openInNewTab(data.node?.documentation);
        break;
      case "disabled":
        break;
      case "ungroup":
        takeSnapshot();
        expandGroupNode(
          data.id,
          updateFlowPosition(position, data.node?.flow!),
          data.node!.template,
          nodes,
          edges,
          setNodes,
          setEdges
        );
        break;
      case "override":
        setShowOverrideModal(true);
        break;
      case "delete":
        deleteNode(data.id);
        break;
      case "copy":
        const node = nodes.filter((node) => node.id === data.id);
        setLastCopiedSelection({ nodes: _.cloneDeep(node), edges: [] });
    }
  };

  const isSaved = flows.some((flow) =>
    Object.values(flow).includes(data.node?.display_name!)
  );

  const setNode = useFlowStore((state) => state.setNode);

  const handleOnNewValue = (
    newValue: string | string[] | boolean | Object[]
  ): void => {
    if (data.node!.template[name].value !== newValue) {
      takeSnapshot();
    }

    data.node!.template[name].value = newValue; // necessary to enable ctrl+z inside the input

    setNode(data.id, (oldNode) => {
      let newNode = cloneDeep(oldNode);

      newNode.data = {
        ...newNode.data,
      };

      newNode.data.node.template[name].value = newValue;

      return newNode;
    });
  };

  const handleNodeClass = (newNodeClass: APIClassType, code?: string): void => {
    if (!data.node) return;
    if (data.node!.template[name].value !== code) {
      takeSnapshot();
    }

    setNode(data.id, (oldNode) => {
      let newNode = cloneDeep(oldNode);

      newNode.data = {
        ...newNode.data,
        node: newNodeClass,
        description: newNodeClass.description ?? data.node!.description,
        display_name: newNodeClass.display_name ?? data.node!.display_name,
      };

      newNode.data.node.template[name].value = code;

      return newNode;
    });
    updateNodeInternals(data.id);
  };

  const [openModal, setOpenModal] = useState(false);
  const hasCode = Object.keys(data.node!.template).includes("code");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        selected &&
        (event.ctrlKey || event.metaKey) &&
        event.key === "e"
      ) {
        event.preventDefault();
        setShowModalAdvanced(state => !state);
      }
      if (
        selected &&
        (event.ctrlKey || event.metaKey) &&
        event.key === "s" &&
        isSaved
      ) {
        event.preventDefault();
        return setShowOverrideModal(state => !state);
      }
      if (
        selected &&
        (event.ctrlKey || event.metaKey) &&
        event.key === "s" &&
        hasCode
      ) {
        event.preventDefault();
        saveComponent(cloneDeep(data), false);
        unselectAll()
      }
      if (
        (selected && data.node?.documentation) &&
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key === "D"
      ) {
        event.preventDefault();
        openInNewTab(data.node?.documentation);
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    }
  }, [])

  return (
    <>
      <div className="w-26 h-10">
        <span className="isolate inline-flex rounded-md shadow-sm">
          {hasCode ? (
            <ShadTooltip content="Code" side="top">
              <button
                className="relative inline-flex items-center rounded-l-md  bg-background px-2 py-2 text-foreground shadow-md ring-1 ring-inset ring-ring transition-all duration-500 ease-in-out hover:bg-muted focus:z-10"
                onClick={() => {
                  setOpenModal(!openModal);
                }}
                data-testid="code-button-modal"
              >
                <div className="hidden">
                    <CodeAreaComponent
                    openModal={openModal}
                    readonly={
                      data.node?.flow && data.node.template[name].dynamic
                        ? true
                        : false
                    }
                    dynamic={data.node?.template[name].dynamic ?? false}
                    setNodeClass={handleNodeClass}
                    nodeClass={data.node}
                    disabled={false}
                    value={data.node?.template[name].value ?? ""}
                    onChange={handleOnNewValue}
                    id={"code-input-node-toolbar-" + name}
                    selected={selected}
                    />
                </div>
                <IconComponent name="TerminalSquare" className="h-4 w-4" />
              </button>
            </ShadTooltip>
          ) : (
            <ShadTooltip content="Save" side="top">
              <button
                className={classNames(
                  "relative -ml-px inline-flex items-center bg-background px-2 py-2 text-foreground shadow-md ring-1 ring-inset ring-ring  transition-all duration-500 ease-in-out hover:bg-muted focus:z-10",
                  hasCode ? "" : "rounded-l-md"
                )}
                onClick={() => {
                  isSaved
                    ? setShowOverrideModal(true)
                    : saveComponent(cloneDeep(data), false);
                }}
              >
                <IconComponent name="SaveAll" className=" h-4 w-4" />
              </button>
            </ShadTooltip>
          )}

          <ShadTooltip content="Duplicate" side="top">
            <button
              className={classNames(
                "relative -ml-px inline-flex items-center bg-background px-2 py-2 text-foreground shadow-md ring-1 ring-inset ring-ring  transition-all duration-500 ease-in-out hover:bg-muted focus:z-10"
              )}
              onClick={(event) => {
                event.preventDefault();
                paste(
                  {
                    nodes: [nodes.find((node) => node.id === data.id)!],
                    edges: [],
                  },
                  {
                    x: 50,
                    y: 10,
                    paneX: nodes.find((node) => node.id === data.id)?.position
                      .x,
                    paneY: nodes.find((node) => node.id === data.id)?.position
                      .y,
                  }
                );
              }}
            >
              <IconComponent name="Copy" className="h-4 w-4" />
            </button>
          </ShadTooltip>

          <ShadTooltip content="Pin" side="top">
            <button
              className={classNames(
                "relative -ml-px inline-flex items-center bg-background px-2 py-2 text-foreground shadow-md ring-1 ring-inset ring-ring  transition-all duration-500 ease-in-out hover:bg-muted focus:z-10"
              )}
              onClick={(event) => {
                event.preventDefault();
                setNode(data.id, (old) => ({
                  ...old,
                  data: {
                    ...old.data,
                    node: {
                      ...old.data.node,
                      pinned: old.data?.node?.pinned ? false : true,
                    },
                  },
                }));
              }}
            >
              <IconComponent
                name="Pin"
                className={cn(
                  "h-4 w-4 transition-all",
                  pinned ? "animate-wiggle fill-current" : ""
                )}
              />
            </button>
          </ShadTooltip>

          <Select onValueChange={handleSelectChange} value="">
            <ShadTooltip content="More" side="top">
              <SelectTrigger>
                <div>
                  <div
                    data-testid="more-options-modal"
                    className={classNames(
                      "relative -ml-px inline-flex h-8 w-[31px] items-center rounded-r-md bg-background text-foreground  shadow-md ring-1 ring-inset  ring-ring transition-all duration-500 ease-in-out hover:bg-muted focus:z-10"
                    )}
                  >
                    <IconComponent
                      name="MoreHorizontal"
                      className="relative left-2 h-4 w-4"
                    />
                  </div>
                </div>
              </SelectTrigger>
            </ShadTooltip>
            <SelectContent>
              {nodeLength > 0 && (
                <SelectItem value={nodeLength === 0 ? "disabled" : "advanced"}>
                  <div className="flex">
                  <IconComponent
                    name="Settings2"
                    className="relative top-0.5 mr-2 h-4 w-4 "
                  />{" "}
                  <span className="">Edit</span>{" "}
                  <IconComponent
                    name="Command"
                    className="absolute right-[1.15rem] top-[0.65em] h-3.5 w-3.5 stroke-2"
                  ></IconComponent>
                  <span className="absolute right-2 top-[0.46em]">E</span>
                </div>
                </SelectItem>
              )}

              {isSaved ? (
                <SelectItem value={"override"}>
                  <div className="flex">
                  <IconComponent
                    name="Settings2"
                    className="relative top-0.5 mr-2 h-4 w-4 "
                  />{" "}
                  <span className="">Save</span>{" "}
                  <IconComponent
                    name="Command"
                    className="absolute right-[1.15rem] top-[0.65em] h-3.5 w-3.5 stroke-2"
                  ></IconComponent>
                  <span className="absolute right-2 top-[0.46em]">S</span>
                </div>
                </SelectItem>
              ) : (
                hasCode && (
                  <SelectItem value={"SaveAll"}>
                    <div className="flex">
                  <IconComponent
                    name="Settings2"
                    className="relative top-0.5 mr-2 h-4 w-4 "
                  />{" "}
                  <span className="">Save</span>{" "}
                  <IconComponent
                    name="Command"
                    className="absolute right-[1.15rem] top-[0.65em] h-3.5 w-3.5 stroke-2"
                  ></IconComponent>
                  <span className="absolute right-2 top-[0.46em]">S</span>
                </div>
                  </SelectItem>
                )
              )}
              <SelectItem value={"copy"}>
                <div className="flex">
                  <IconComponent
                    name="Copy"
                    className="relative top-0.5 mr-2 h-4 w-4 "
                  />{" "}
                  <span className="">Copy</span>{" "}
                  <IconComponent
                    name="Command"
                    className="absolute right-[1.15rem] top-[0.65em] h-3.5 w-3.5 stroke-2"
                  ></IconComponent>
                  <span className="absolute right-2 top-[0.5em]">C</span>
                </div>
              </SelectItem>
              {hasStore && (
                <SelectItem
                  value={"Share"}
                  disabled={!hasApiKey || !validApiKey}
                >
                  <div className="flex" data-testid="save-button-modal">
                    <IconComponent
                      name="Share3"
                      className="relative top-0.5 -m-1 mr-1 h-6 w-6"
                    />{" "}
                    Share{" "}
                  </div>{" "}
                </SelectItem>
              )}
              {!hasStore && (
                <SelectItem value={"Download"}>
                  <div className="flex">
                    <IconComponent
                      name="Download"
                      className="relative top-0.5 mr-2 h-4 w-4"
                    />{" "}
                    Download{" "}
                  </div>{" "}
                </SelectItem>
              )}
              <SelectItem
                value={"documentation"}
                disabled={data.node?.documentation === ""}
              >
                <div className="flex">
                  <IconComponent
                    name="FileText"
                    className="relative top-0.5 mr-2 h-4 w-4 "
                  />{" "}
                  <span className="">Docs</span>{" "}
                  <IconComponent
                    name="Command"
                    className="absolute right-[2rem] top-[0.65em] h-3.5 w-3.5 stroke-2"
                  ></IconComponent>
                  <IconComponent
                    name="ArrowBigUp"
                    className="absolute right-[1.15rem] top-[0.65em] h-3.5 w-3.5 stroke-2"
                  ></IconComponent>
                  <span className="absolute right-2 top-[0.419em]">D</span>
                </div>
              </SelectItem>
              {isMinimal && (
                <SelectItem value={"show"}>
                  <div className="flex">
                    <IconComponent
                      name={showNode ? "Minimize2" : "Maximize2"}
                      className="relative top-0.5 mr-2 h-4 w-4"
                    />
                    {showNode ? "Minimize" : "Expand"}
                  </div>
                </SelectItem>
              )}
              {isGroup && (
                <SelectItem value="ungroup">
                  <div className="flex">
                    <IconComponent
                      name="Combine"
                      className="relative top-0.5 mr-2 h-4 w-4"
                    />{" "}
                    Ungroup{" "}
                  </div>
                </SelectItem>
              )}

              <SelectItem value={"delete"} className="focus:bg-red-400/[.20]">
                <div className="font-red flex text-status-red">
                  <IconComponent
                    name="Trash2"
                    className="relative top-0.5 mr-2 h-4 w-4 "
                  />{" "}
                  <span className="">Delete</span>{" "}
                  <span>
                    <IconComponent
                      name="Delete"
                      className="absolute right-2 top-2 h-4 w-4 stroke-2 text-red-400"
                    ></IconComponent>
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <ConfirmationModal
            open={showOverrideModal}
            title={`Replace`}
            cancelText="Create New"
            confirmationText="Replace"
            size={"x-small"}
            icon={"SaveAll"}
            index={6}
            onConfirm={(index, user) => {
              saveComponent(cloneDeep(data), true);
            }}
            onClose={setShowOverrideModal}
            onCancel={() => saveComponent(cloneDeep(data), false)}
          >
            <ConfirmationModal.Content>
              <span>
                It seems {data.node?.display_name} already exists. Do you want
                to replace it with the current or create a new one?
              </span>
            </ConfirmationModal.Content>
          </ConfirmationModal>
          <EditNodeModal
            data={data}
            nodeLength={nodeLength}
            open={showModalAdvanced}
            setOpen={setShowModalAdvanced}
          />
          <ShareModal
            open={showconfirmShare}
            setOpen={setShowconfirmShare}
            is_component={true}
            component={flowComponent!}
          />
        </span>
      </div>
    </>
  );
}
