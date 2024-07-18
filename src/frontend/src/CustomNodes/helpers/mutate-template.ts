import {
  ERROR_UPDATING_COMPONENT,
  SAVE_DEBOUNCE_TIME,
  TITLE_ERROR_UPDATING_COMPONENT,
} from "@/constants/constants";
import {
  APIClassType,
  APITemplateType,
  ResponseErrorDetailAPI,
} from "@/types/api";
import { UseMutationResult } from "@tanstack/react-query";
import { cloneDeep, debounce } from "lodash";

export const mutateTemplate = debounce(
  async (
    newValue,
    node: APIClassType,
    nodeId: string,
    postTemplateValue: UseMutationResult<
      APITemplateType | undefined,
      ResponseErrorDetailAPI,
      any
    >,
    setNode,
    setErrorData,
  ) => {
    try {
      const newNode = cloneDeep(node);
      const newTemplate = await postTemplateValue.mutateAsync({
        value: newValue,
      });
      if (newTemplate) {
        newNode.template = newTemplate;
      }
      setNode(nodeId, (oldNode) => {
        const newData = cloneDeep(oldNode.data);
        newData.node = newNode;
        return {
          ...oldNode,
          data: newData,
        };
      });
    } catch (e) {
      const error = e as ResponseErrorDetailAPI;
      setErrorData({
        title: TITLE_ERROR_UPDATING_COMPONENT,
        list: [error.response?.data?.detail || ERROR_UPDATING_COMPONENT],
      });
    }
  },
  SAVE_DEBOUNCE_TIME,
);
